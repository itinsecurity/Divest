import { load as cheerioLoad } from "cheerio";
import { waitForRateLimit } from "@/lib/enrichment/rate-limiter";
import { scoreCandidate, shouldAutoSelect } from "@/lib/enrichment/candidates";
import type { DataSource, SourceResult, CandidateData } from "./registry";
import type { IdentifierInfo } from "@/lib/enrichment/normalizer";

const SEARCH_URL =
  "https://live.euronext.com/en/instrumentSearch/searchJSON";

const HEADERS = {
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  "X-Requested-With": "XMLHttpRequest",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Dest": "empty",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const MIC_TO_EXCHANGE: Record<string, string> = {
  XOSL: "Oslo Bors",
  MERK: "Euronext Growth Oslo",
  XOAS: "Oslo Axess",
};

const ISIN_PREFIX_TO_COUNTRY: Record<string, string> = {
  NO: "Norway",
  SE: "Sweden",
  DK: "Denmark",
  FI: "Finland",
  DE: "Germany",
  GB: "United Kingdom",
  US: "United States",
  FR: "France",
  NL: "Netherlands",
  CH: "Switzerland",
};

function parseTickerFromLabel(label: string): string | null {
  try {
    const $ = cheerioLoad(label);
    const ticker = $(".instrument-symbol").text().trim();
    return ticker || null;
  } catch {
    return null;
  }
}

function countryFromIsin(isin: string | null): string | null {
  if (!isin || isin.length < 2) return null;
  return ISIN_PREFIX_TO_COUNTRY[isin.slice(0, 2).toUpperCase()] ?? null;
}

type EuronextSearchItem = {
  value: string;
  isin: string;
  mic: string;
  name: string;
  label: string;
  link: string;
};

/** Fixture response returned when ENRICHMENT_TEST_MODE=true. */
const TEST_FIXTURES: Record<string, SourceResult> = {
  NO0010096985: {
    status: "found",
    sourceId: "euronext",
    data: {
      name: "EQUINOR ASA",
      ticker: "EQNR",
      isin: "NO0010096985",
      exchange: "Oslo Bors",
      country: "Norway",
    },
  },
};

export const euronextSource: DataSource = {
  id: "euronext",
  supportedTypes: ["STOCK"],

  async fetch(
    identifier: IdentifierInfo,
    instrumentType: "STOCK" | "FUND"
  ): Promise<SourceResult> {
    if (instrumentType !== "STOCK") {
      return { status: "not_found" };
    }

    // In test mode return a hardcoded fixture so E2E tests never hit live URLs
    if (process.env.ENRICHMENT_TEST_MODE === "true") {
      return TEST_FIXTURES[identifier.normalized] ?? { status: "not_found" };
    }

    const url = `${SEARCH_URL}?q=${encodeURIComponent(identifier.normalized)}`;

    try {
      await waitForRateLimit(url);

      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) {
        return {
          status: "error",
          retryable: response.status >= 500,
          message: `HTTP ${response.status}`,
        };
      }

      const items: EuronextSearchItem[] = await response.json();

      // Filter out the trailing "See all results" placeholder
      const real = items.filter(
        (item) =>
          item.isin &&
          item.isin.length > 0 &&
          item.name &&
          item.name.length > 0
      );

      if (real.length === 0) {
        return { status: "not_found" };
      }

      const candidates: CandidateData[] = real.map((item) => ({
        name: item.name,
        ticker: parseTickerFromLabel(item.label),
        isin: item.isin || null,
        exchange: MIC_TO_EXCHANGE[item.mic] ?? item.mic,
        instrumentType: "STOCK",
        sourceId: "euronext",
        rawData: item as unknown as Record<string, unknown>,
        score: 0,
      }));

      // Score each candidate
      const scored = candidates.map((c) => ({
        ...c,
        score: scoreCandidate(c, identifier),
      }));

      const autoSelected = shouldAutoSelect(scored);

      if (!autoSelected && scored.length > 1) {
        return { status: "multiple", candidates: scored };
      }

      const chosen = autoSelected ?? scored[0];

      return {
        status: "found",
        sourceId: "euronext",
        data: {
          name: chosen.name,
          ticker: chosen.ticker,
          isin: chosen.isin,
          exchange: chosen.exchange,
          country: countryFromIsin(chosen.isin),
        },
      };
    } catch {
      return {
        status: "error",
        retryable: true,
        message: "Network error",
      };
    }
  },
};

// ─── Euronext Fund List Source ────────────────────────────────────────────────

const FUND_LIST_URL =
  "https://live.euronext.com/en/pd_es/data/funds?mics=WOMF";

type EuronextFundRow = [
  string, // label HTML
  string, // isin
  string, // mic
  string, // name
  ...unknown[]
];

/** Test-mode fixture for fund list source */
const FUND_LIST_TEST_FIXTURES: Record<string, SourceResult> = {};

export const euronextFundSource: DataSource = {
  id: "euronext-fund",
  supportedTypes: ["FUND"],

  async fetch(
    identifier: IdentifierInfo,
    instrumentType: "STOCK" | "FUND"
  ): Promise<SourceResult> {
    if (instrumentType !== "FUND") {
      return { status: "not_found" };
    }

    if (process.env.ENRICHMENT_TEST_MODE === "true") {
      return (
        FUND_LIST_TEST_FIXTURES[identifier.normalized] ?? { status: "not_found" }
      );
    }

    const url = FUND_LIST_URL;

    try {
      await waitForRateLimit(url);

      const body = new URLSearchParams({
        iDisplayLength: "100",
        sSearch: identifier.normalized,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          status: "error",
          retryable: response.status >= 500,
          message: `HTTP ${response.status}`,
        };
      }

      const json = (await response.json()) as { aaData?: EuronextFundRow[] };
      const rows = json.aaData ?? [];

      if (rows.length === 0) {
        return { status: "not_found" };
      }

      // Try to find exact ISIN match or name match
      const match =
        rows.find((r) => r[1] === identifier.normalized) ??
        rows.find((r) =>
          r[3].toLowerCase().includes(identifier.normalized.toLowerCase())
        );

      if (!match) {
        return { status: "not_found" };
      }

      const [labelHtml, isin, mic, name] = match;
      const ticker = parseTickerFromLabel(labelHtml);

      return {
        status: "found",
        sourceId: "euronext-fund",
        data: {
          name,
          ticker,
          isin: isin || null,
          exchange: MIC_TO_EXCHANGE[mic] ?? mic,
          country: countryFromIsin(isin),
        },
      };
    } catch {
      return {
        status: "error",
        retryable: true,
        message: "Network error",
      };
    }
  },
};

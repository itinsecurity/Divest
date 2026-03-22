import { extractText } from "unpdf";
import { waitForRateLimit } from "@/lib/enrichment/rate-limiter";
import type { DataSource, SourceResult } from "./registry";
import type { IdentifierInfo } from "@/lib/enrichment/normalizer";

const BASE_URL =
  "https://api.fund.storebrand.no/open/funddata/document?documentType=FUND_PROFILE";

type FundCategory = "EQUITY" | "BOND" | "COMBINATION";

function parseFundCategory(text: string): FundCategory | null {
  const match = text.match(/Fund Category\s*:\s*([^\n]+)/i);
  if (!match) return null;
  const raw = match[1].trim().toLowerCase();
  if (raw.includes("equity") || raw.includes("stock")) return "EQUITY";
  if (raw.includes("bond") || raw.includes("fixed")) return "BOND";
  if (
    raw.includes("mix") ||
    raw.includes("alloc") ||
    raw.includes("balanced") ||
    raw.includes("combination")
  )
    return "COMBINATION";
  return null;
}

function parseFundManager(text: string): string | null {
  const match = text.match(/Fund Manager\s*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function parsePct(text: string, label: string): number | null {
  // Match lines like "Equity: 96.50%"
  const re = new RegExp(`${label}\\s*:\\s*([\\d.]+)\\s*%`, "i");
  const match = text.match(re);
  return match ? parseFloat(match[1]) : null;
}

function parseWeightingsBlock(
  text: string,
  heading: string
): Record<string, number> | null {
  // Walk line-by-line: find the heading, then collect "Label XX.XX%" lines
  // until we hit a blank line (end of block)
  const lines = text.split("\n");
  const result: Record<string, number> = {};
  const valueRe = /^([A-Za-z][A-Za-z\s]+?)\s+([\d.]+)\s*%\s*$/;
  let inBlock = false;

  for (const line of lines) {
    if (line.trim().toLowerCase() === heading.toLowerCase()) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (line.trim() === "") break; // blank line ends the block
    const m = valueRe.exec(line.trim());
    if (m) {
      result[m[1].trim()] = parseFloat(m[2]);
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/** Fixture responses returned when ENRICHMENT_TEST_MODE=true. */
const TEST_FIXTURES: Record<string, SourceResult> = {
  NO0010140502: {
    status: "found",
    sourceId: "storebrand",
    data: {
      fundManager: "Storebrand Asset Management",
      fundCategory: "EQUITY",
      equityPct: 96.5,
      bondPct: 3.5,
      sectorWeightings: { Technology: 28, Financials: 18, Other: 54 },
      geographicWeightings: {
        "United States": 65,
        Europe: 15,
        Other: 20,
      },
    },
  },
  // Separate fixture used by the fund enrichment E2E test to avoid
  // colliding with the seeded NO0010140502 profile in global-setup.
  NO0010001500: {
    status: "found",
    sourceId: "storebrand",
    data: {
      name: "Test Storebrand Fund",
      fundManager: "Test Fund Manager",
      fundCategory: "EQUITY",
      equityPct: 80,
      bondPct: 20,
    },
  },
};

export const storebrandSource: DataSource = {
  id: "storebrand",
  supportedTypes: ["FUND"],

  async fetch(
    identifier: IdentifierInfo,
    instrumentType: "STOCK" | "FUND"
  ): Promise<SourceResult> {
    if (instrumentType !== "FUND") {
      return { status: "not_found" };
    }

    // This source requires an ISIN — name/ticker lookups are handled by the
    // web-search fallback source
    if (identifier.detectedType !== "ISIN") {
      return { status: "not_found" };
    }

    // In test mode return a hardcoded fixture so E2E tests never hit live URLs
    if (process.env.ENRICHMENT_TEST_MODE === "true") {
      return TEST_FIXTURES[identifier.normalized] ?? { status: "not_found" };
    }

    const url = `${BASE_URL}&isin=${encodeURIComponent(identifier.normalized)}&languageCode=en-GB&market=NOR`;

    try {
      await waitForRateLimit(url);

      const response = await fetch(url, {
        headers: {
          Accept: "application/pdf",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return { status: "not_found" };
      }

      const buffer = await response.arrayBuffer();
      const { text } = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });

      if (!text) {
        return { status: "not_found" };
      }

      const fundManager = parseFundManager(text);
      const fundCategory = parseFundCategory(text);
      const equityPct = parsePct(text, "Equity");
      const bondPct = parsePct(text, "Bond") ?? parsePct(text, "Bonds");
      const sectorWeightings = parseWeightingsBlock(text, "Sector Weightings");
      const geographicWeightings = parseWeightingsBlock(
        text,
        "Geographic Breakdown"
      );

      // Nothing useful was extracted — likely a non-Storebrand fund or bad PDF
      if (!fundManager && !fundCategory && equityPct === null && bondPct === null) {
        return { status: "not_found" };
      }

      return {
        status: "found",
        sourceId: "storebrand",
        data: {
          fundManager: fundManager ?? null,
          fundCategory: fundCategory ?? null,
          equityPct: equityPct ?? null,
          bondPct: bondPct ?? null,
          sectorWeightings: sectorWeightings ?? null,
          geographicWeightings: geographicWeightings ?? null,
        },
      };
    } catch {
      return { status: "not_found" };
    }
  },
};

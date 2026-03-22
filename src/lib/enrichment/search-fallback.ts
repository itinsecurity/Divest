import { waitForRateLimit } from "./rate-limiter";
import type { IdentifierInfo } from "./normalizer";
import type { AssetProfileUpdateData } from "./types";

const SERPER_URL = "https://google.serper.dev/search";

type SerperResult = {
  organic?: Array<{ link: string; title: string; snippet?: string }>;
};

/**
 * Performs a web search via Serper.dev to find instrument data when all
 * direct sources fail. Returns null immediately if SERPER_API_KEY is unset.
 */
export async function searchFallback(
  identifier: IdentifierInfo,
  instrumentType: "STOCK" | "FUND"
): Promise<Partial<AssetProfileUpdateData> | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const suffix = instrumentType === "STOCK" ? "stock ISIN" : "fund Norway";
  const query = `"${identifier.normalized}" ${suffix}`;

  try {
    await waitForRateLimit(SERPER_URL);

    const response = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SerperResult;
    const organic = data.organic ?? [];

    // Look for results from known data sources
    const knownDomains = ["live.euronext.com", "api.fund.storebrand.no"];
    const knownResult = organic.find((r) =>
      knownDomains.some((domain) => r.link.includes(domain))
    );

    if (!knownResult) {
      return null;
    }

    // Basic name extraction from the search result title
    // Full parsing would require fetching + parsing the linked page, which is
    // left as a future enhancement; for now return the name from the title
    const name = knownResult.title.split(" - ")[0].trim() || null;
    if (!name) {
      return null;
    }

    return { name };
  } catch {
    return null;
  }
}

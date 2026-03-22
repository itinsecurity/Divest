import type { AssetProfileUpdateData } from "@/lib/enrichment/types";

/**
 * Thin shim preserved for backward compatibility with tests.
 * The real implementation is now in euronext.ts via the source registry.
 */
export async function fetchFromEuronext(
  isin: string
): Promise<Partial<AssetProfileUpdateData> | null> {
  try {
    const url = `https://live.euronext.com/en/instrumentSearch/searchJSON?q=${encodeURIComponent(isin)}`;
    const response = await fetch(url, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    await response.text(); // consume body
    return null; // full parsing is done via euronextSource
  } catch {
    return null;
  }
}

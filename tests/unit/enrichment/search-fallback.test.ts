import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IdentifierInfo } from "@/lib/enrichment/normalizer";

vi.mock("@/lib/enrichment/rate-limiter", () => ({
  waitForRateLimit: vi.fn().mockResolvedValue(undefined),
}));

// searchFallback module is imported after mocks are set up
import { searchFallback } from "@/lib/enrichment/search-fallback";

function isinIdentifier(isin: string): IdentifierInfo {
  return { raw: isin, normalized: isin, detectedType: "ISIN" };
}

function nameIdentifier(name: string): IdentifierInfo {
  return { raw: name, normalized: name, detectedType: "NAME" };
}

describe("searchFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    delete process.env.SERPER_API_KEY;
  });

  it("returns null immediately when SERPER_API_KEY is not set", async () => {
    const result = await searchFallback(
      isinIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls POST https://google.serper.dev/search with correct headers", async () => {
    process.env.SERPER_API_KEY = "test-api-key";
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [] }),
    } as Response);

    await searchFallback(isinIdentifier("NO0010096985"), "STOCK");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://google.serper.dev/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-API-KEY": "test-api-key",
        }),
      })
    );
  });

  it("uses stock query format: identifier + 'stock ISIN'", async () => {
    process.env.SERPER_API_KEY = "test-api-key";
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [] }),
    } as Response);

    await searchFallback(nameIdentifier("Equinor"), "STOCK");

    const call = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.q).toContain("Equinor");
    expect(body.q.toLowerCase()).toContain("stock");
  });

  it("uses fund query format: identifier + 'fund Norway'", async () => {
    process.env.SERPER_API_KEY = "test-api-key";
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [] }),
    } as Response);

    await searchFallback(nameIdentifier("Storebrand Global"), "FUND");

    const call = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.q).toContain("Storebrand Global");
    expect(body.q.toLowerCase()).toContain("fund");
  });

  it("returns null when no results contain known-source URLs", async () => {
    process.env.SERPER_API_KEY = "test-api-key";
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [
          { link: "https://unknown-site.com/some-page", title: "Unknown" },
        ],
      }),
    } as Response);

    const result = await searchFallback(
      isinIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result).toBeNull();
  });

  it("returns null without throwing when fetch fails", async () => {
    process.env.SERPER_API_KEY = "test-api-key";
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const result = await searchFallback(
      isinIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result).toBeNull();
  });

  it("returns null without throwing when API returns non-200", async () => {
    process.env.SERPER_API_KEY = "test-api-key";
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    const result = await searchFallback(
      isinIdentifier("NO0010096985"),
      "STOCK"
    );
    expect(result).toBeNull();
  });
});

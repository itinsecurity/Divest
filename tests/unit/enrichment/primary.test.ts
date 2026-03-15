import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectISIN, buildEnrichmentData } from "@/lib/enrichment/primary";

describe("detectISIN", () => {
  it("recognizes a valid ISIN", () => {
    expect(detectISIN("NO0010031479")).toBe(true);
  });

  it("recognizes another valid ISIN", () => {
    expect(detectISIN("NO0008001872")).toBe(true);
  });

  it("rejects a ticker symbol", () => {
    expect(detectISIN("DNB")).toBe(false);
  });

  it("rejects a partial ISIN", () => {
    expect(detectISIN("NO001003")).toBe(false);
  });

  it("rejects lowercase ISIN", () => {
    expect(detectISIN("no0010031479")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(detectISIN("")).toBe(false);
  });
});

describe("buildEnrichmentData", () => {
  it("builds a valid enrichment data object with all fields", () => {
    const data = buildEnrichmentData({
      name: "DNB Bank ASA",
      ticker: "DNB",
      isin: "NO0010031479",
      exchange: "Oslo Børs",
      country: "Norway",
      sector: "Financials",
      industry: "Banks",
    });

    expect(data.name).toBe("DNB Bank ASA");
    expect(data.ticker).toBe("DNB");
    expect(data.isin).toBe("NO0010031479");
    expect(data.exchange).toBe("Oslo Børs");
    expect(data.country).toBe("Norway");
    expect(data.sector).toBe("Financials");
    expect(data.industry).toBe("Banks");
  });

  it("allows partial fields", () => {
    const data = buildEnrichmentData({
      name: "Some Fund",
      ticker: null,
    });

    expect(data.name).toBe("Some Fund");
    expect(data.ticker).toBeNull();
  });
});

describe("primary enrichment fetch (mocked)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attempts to fetch from Euronext for ISIN-based stocks", async () => {
    const { fetchFromEuronext } = await import("@/lib/enrichment/primary");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "some content",
    });

    await fetchFromEuronext("NO0010031479");
    expect(fetchMock).toHaveBeenCalled();
    // The key thing is that fetch was called
  });

  it("returns null when fetch fails", async () => {
    const { fetchFromEuronext } = await import("@/lib/enrichment/primary");

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchFromEuronext("NO0010031479");
    expect(result).toBeNull();
  });
});

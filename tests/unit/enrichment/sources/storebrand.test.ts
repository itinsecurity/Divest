import { describe, it, expect, vi, beforeEach } from "vitest";
import { storebrandSource } from "@/lib/enrichment/sources/storebrand";
import type { IdentifierInfo } from "@/lib/enrichment/normalizer";

// Mock unpdf so tests don't need a real PDF
vi.mock("unpdf", () => ({
  extractText: vi.fn(),
}));

// Mock the rate limiter so tests run without delay
vi.mock("@/lib/enrichment/rate-limiter", () => ({
  waitForRateLimit: vi.fn().mockResolvedValue(undefined),
}));

const { extractText } = await import("unpdf");

const SAMPLE_FUND_TEXT = `
Morningstar Fund Profile
Storebrand Global Indeks A

Fund Manager: Storebrand Asset Management
Fund Category: Equity

Asset Allocation
Equity: 96.50%
Bonds: 3.50%

Sector Weightings
Technology 28.00%
Financials 18.00%
Healthcare 14.00%
Consumer Discretionary 10.00%
Industrials 8.00%

Geographic Breakdown
United States 65.00%
Europe 15.00%
Japan 8.00%
Emerging Markets 7.00%
Other 5.00%
`;

function isinIdentifier(isin: string): IdentifierInfo {
  return { raw: isin, normalized: isin, detectedType: "ISIN" };
}

function nameIdentifier(name: string): IdentifierInfo {
  return { raw: name, normalized: name, detectedType: "NAME" };
}

describe("storebrandSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("fetches the correct URL for a given ISIN", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    // Overloaded function — cast mock to avoid type complexity
(extractText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: SAMPLE_FUND_TEXT,
      totalPages: 1,
    });

    await storebrandSource.fetch(isinIdentifier("NO0010817851"), "FUND");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("NO0010817851"),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("api.fund.storebrand.no"),
      expect.any(Object)
    );
  });

  it("returns not_found when identifier is not an ISIN", async () => {
    const result = await storebrandSource.fetch(
      nameIdentifier("Storebrand Global"),
      "FUND"
    );
    expect(result.status).toBe("not_found");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns not_found when instrumentType is STOCK", async () => {
    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "STOCK"
    );
    expect(result.status).toBe("not_found");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns not_found on non-200 HTTP response", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );
    expect(result.status).toBe("not_found");
  });

  it("returns not_found on network error", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );
    expect(result.status).toBe("not_found");
  });

  it("parses fundManager from PDF text", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    // Overloaded function — cast mock to avoid type complexity
(extractText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: SAMPLE_FUND_TEXT,
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.fundManager).toBe("Storebrand Asset Management");
    }
  });

  it("maps fund category to EQUITY enum value", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    // Overloaded function — cast mock to avoid type complexity
(extractText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: SAMPLE_FUND_TEXT,
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.fundCategory).toBe("EQUITY");
    }
  });

  it("parses equityPct and bondPct as numbers", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    // Overloaded function — cast mock to avoid type complexity
(extractText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: SAMPLE_FUND_TEXT,
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.equityPct).toBeCloseTo(96.5);
      expect(result.data.bondPct).toBeCloseTo(3.5);
    }
  });

  it("parses sectorWeightings as a Record<string, number>", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    // Overloaded function — cast mock to avoid type complexity
(extractText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: SAMPLE_FUND_TEXT,
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.sectorWeightings).toBeDefined();
      expect(result.data.sectorWeightings?.Technology).toBeCloseTo(28);
      expect(result.data.sectorWeightings?.Financials).toBeCloseTo(18);
    }
  });

  it("parses geographicWeightings as a Record<string, number>", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    // Overloaded function — cast mock to avoid type complexity
(extractText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: SAMPLE_FUND_TEXT,
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.geographicWeightings).toBeDefined();
      expect(result.data.geographicWeightings?.["United States"]).toBeCloseTo(
        65
      );
      expect(result.data.geographicWeightings?.["Europe"]).toBeCloseTo(15);
    }
  });

  it("returns not_found when extracted text has no recognizable fields", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    vi.mocked(extractText).mockResolvedValue({
      text: "This PDF has no useful fund data.",
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("not_found");
  });

  it("maps 'Bond' category text to BOND enum value", async () => {
    const bondText = SAMPLE_FUND_TEXT.replace("Fund Category: Equity", "Fund Category: Bond");
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    vi.mocked(extractText).mockResolvedValue({
      text: bondText,
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.fundCategory).toBe("BOND");
    }
  });

  it("maps 'Mixed' or 'Allocation' category text to COMBINATION enum value", async () => {
    const mixedText = SAMPLE_FUND_TEXT.replace(
      "Fund Category: Equity",
      "Fund Category: Mixed Allocation"
    );
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    vi.mocked(extractText).mockResolvedValue({
      text: mixedText,
      totalPages: 1,
    });

    const result = await storebrandSource.fetch(
      isinIdentifier("NO0010817851"),
      "FUND"
    );

    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.data.fundCategory).toBe("COMBINATION");
    }
  });
});

import { describe, it, expect } from "vitest";
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

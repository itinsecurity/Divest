import { describe, it, expect } from "vitest";
import { computeSectorSpread, computeGeographicSpread } from "@/lib/spread";
import type { HoldingWithProfile, AssetProfileData } from "@/types";

function makeHolding(
  overrides: Partial<HoldingWithProfile> & { displayValue: number }
): HoldingWithProfile {
  return {
    id: "h1",
    instrumentIdentifier: "TEST",
    instrumentType: "STOCK",
    accountName: "Account",
    shares: null,
    pricePerShare: null,
    currentValue: null,
    enrichmentStatus: "COMPLETE",
    lastUpdated: new Date().toISOString(),
    assetProfile: null,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<AssetProfileData> = {}): AssetProfileData {
  return {
    id: "p1",
    instrumentType: "STOCK",
    isin: null,
    ticker: null,
    name: null,
    exchange: null,
    country: null,
    sector: null,
    industry: null,
    fundManager: null,
    fundCategory: null,
    equityPct: null,
    bondPct: null,
    sectorWeightings: null,
    geographicWeightings: null,
    fieldSources: {},
    ...overrides,
  };
}

describe("computeSectorSpread", () => {
  it("attributes full stock value to its sector", () => {
    const holdings = [
      makeHolding({
        instrumentType: "STOCK",
        displayValue: 10000,
        assetProfile: makeProfile({ sector: "Financials" }),
      }),
    ];
    const result = computeSectorSpread(holdings);
    const fin = result.buckets.find((b) => b.name === "Financials");
    expect(fin?.value).toBe(10000);
    expect(result.total).toBe(10000);
  });

  it("puts stock with null sector into Unclassified", () => {
    const holdings = [
      makeHolding({
        instrumentType: "STOCK",
        displayValue: 5000,
        assetProfile: makeProfile({ sector: null }),
      }),
    ];
    const result = computeSectorSpread(holdings);
    const unc = result.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBe(5000);
  });

  it("distributes fund value proportionally by sectorWeightings", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 100000,
        assetProfile: makeProfile({
          instrumentType: "FUND",
          sectorWeightings: { Technology: 60, Financials: 40 },
        }),
      }),
    ];
    const result = computeSectorSpread(holdings);
    const tech = result.buckets.find((b) => b.name === "Technology");
    const fin = result.buckets.find((b) => b.name === "Financials");
    expect(tech?.value).toBeCloseTo(60000);
    expect(fin?.value).toBeCloseTo(40000);
  });

  it("puts remainder in Unclassified when fund weightings sum < 100%", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 100000,
        assetProfile: makeProfile({
          instrumentType: "FUND",
          sectorWeightings: { Technology: 60 }, // only 60%
        }),
      }),
    ];
    const result = computeSectorSpread(holdings);
    const unc = result.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBeCloseTo(40000);
  });

  it("puts fund with no weightings into Unclassified", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 20000,
        assetProfile: makeProfile({ instrumentType: "FUND", sectorWeightings: null }),
      }),
    ];
    const result = computeSectorSpread(holdings);
    const unc = result.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBe(20000);
  });

  it("puts holding with no profile into Unclassified", () => {
    const holdings = [makeHolding({ displayValue: 15000, assetProfile: null })];
    const result = computeSectorSpread(holdings);
    const unc = result.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBe(15000);
  });

  it("counts incompleteHoldings correctly", () => {
    const holdings = [
      makeHolding({ displayValue: 10000, enrichmentStatus: "PENDING", assetProfile: null }),
      makeHolding({ id: "h2", displayValue: 10000, enrichmentStatus: "COMPLETE", assetProfile: makeProfile({ sector: "Tech" }) }),
    ];
    const result = computeSectorSpread(holdings);
    expect(result.incompleteHoldings).toBe(1);
  });

  it("Unclassified bucket is last in sorted output", () => {
    const holdings = [
      makeHolding({ displayValue: 5000, assetProfile: null }),
      makeHolding({ id: "h2", displayValue: 50000, instrumentType: "STOCK", assetProfile: makeProfile({ sector: "Financials" }) }),
    ];
    const result = computeSectorSpread(holdings);
    const last = result.buckets[result.buckets.length - 1];
    expect(last.isUnclassified).toBe(true);
  });
});

describe("computeGeographicSpread", () => {
  it("attributes full stock value to its country", () => {
    const holdings = [
      makeHolding({
        instrumentType: "STOCK",
        displayValue: 20000,
        assetProfile: makeProfile({ country: "Norway" }),
      }),
    ];
    const result = computeGeographicSpread(holdings);
    const norway = result.buckets.find((b) => b.name === "Norway");
    expect(norway?.value).toBe(20000);
  });

  it("puts stock with null country into Unclassified", () => {
    const holdings = [
      makeHolding({
        instrumentType: "STOCK",
        displayValue: 5000,
        assetProfile: makeProfile({ country: null }),
      }),
    ];
    const result = computeGeographicSpread(holdings);
    const unc = result.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBe(5000);
  });

  it("distributes fund value proportionally by geographicWeightings", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 100000,
        assetProfile: makeProfile({
          instrumentType: "FUND",
          geographicWeightings: { Norway: 40, Europe: 60 },
        }),
      }),
    ];
    const result = computeGeographicSpread(holdings);
    const norway = result.buckets.find((b) => b.name === "Norway");
    const europe = result.buckets.find((b) => b.name === "Europe");
    expect(norway?.value).toBeCloseTo(40000);
    expect(europe?.value).toBeCloseTo(60000);
  });

  it("puts remainder in Unclassified when geographic weightings sum < 100%", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 100000,
        assetProfile: makeProfile({
          instrumentType: "FUND",
          geographicWeightings: { Norway: 70 }, // only 70%
        }),
      }),
    ];
    const result = computeGeographicSpread(holdings);
    const unc = result.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBeCloseTo(30000);
  });

  it("puts fund with no geographic weightings into Unclassified", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 25000,
        assetProfile: makeProfile({ instrumentType: "FUND", geographicWeightings: null }),
      }),
    ];
    const result = computeGeographicSpread(holdings);
    const unc = result.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBe(25000);
  });
});

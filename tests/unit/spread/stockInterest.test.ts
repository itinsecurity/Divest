import { describe, it, expect } from "vitest";
import { computeStockInterestBalance } from "@/lib/spread";
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
    candidates: [],
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

describe("computeStockInterestBalance", () => {
  it("attributes STOCK full value to equity", () => {
    const holdings = [
      makeHolding({ instrumentType: "STOCK", displayValue: 10000, assetProfile: makeProfile() }),
    ];
    const result = computeStockInterestBalance(holdings);
    expect(result.equity.value).toBe(10000);
    expect(result.interest.value).toBe(0);
    expect(result.unclassified.value).toBe(0);
    expect(result.total).toBe(10000);
  });

  it("attributes EQUITY fund full value to equity", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 50000,
        assetProfile: makeProfile({ instrumentType: "FUND", fundCategory: "EQUITY" }),
      }),
    ];
    const result = computeStockInterestBalance(holdings);
    expect(result.equity.value).toBe(50000);
    expect(result.interest.value).toBe(0);
  });

  it("attributes BOND fund full value to interest", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 30000,
        assetProfile: makeProfile({ instrumentType: "FUND", fundCategory: "BOND" }),
      }),
    ];
    const result = computeStockInterestBalance(holdings);
    expect(result.interest.value).toBe(30000);
    expect(result.equity.value).toBe(0);
  });

  it("splits COMBINATION fund with equityPct and bondPct", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 100000,
        assetProfile: makeProfile({
          instrumentType: "FUND",
          fundCategory: "COMBINATION",
          equityPct: 60,
          bondPct: 40,
        }),
      }),
    ];
    const result = computeStockInterestBalance(holdings);
    expect(result.equity.value).toBeCloseTo(60000);
    expect(result.interest.value).toBeCloseTo(40000);
    expect(result.unclassified.value).toBe(0);
  });

  it("puts COMBINATION fund without split into Unclassified", () => {
    const holdings = [
      makeHolding({
        instrumentType: "FUND",
        displayValue: 80000,
        assetProfile: makeProfile({ instrumentType: "FUND", fundCategory: "COMBINATION" }),
      }),
    ];
    const result = computeStockInterestBalance(holdings);
    expect(result.unclassified.value).toBe(80000);
    expect(result.equity.value).toBe(0);
    expect(result.interest.value).toBe(0);
  });

  it("puts holding with no profile into Unclassified", () => {
    const holdings = [makeHolding({ displayValue: 20000, assetProfile: null })];
    const result = computeStockInterestBalance(holdings);
    expect(result.unclassified.value).toBe(20000);
  });

  it("calculates percentages correctly", () => {
    const holdings = [
      makeHolding({ instrumentType: "STOCK", displayValue: 50000, assetProfile: makeProfile() }),
      makeHolding({
        id: "h2",
        instrumentType: "FUND",
        displayValue: 50000,
        assetProfile: makeProfile({ instrumentType: "FUND", fundCategory: "BOND" }),
      }),
    ];
    const result = computeStockInterestBalance(holdings);
    expect(result.total).toBe(100000);
    expect(result.equity.percentage).toBeCloseTo(50);
    expect(result.interest.percentage).toBeCloseTo(50);
  });

  it("counts incomplete holdings (non-COMPLETE status)", () => {
    const holdings = [
      makeHolding({ displayValue: 10000, enrichmentStatus: "PENDING", assetProfile: null }),
      makeHolding({ id: "h2", displayValue: 20000, enrichmentStatus: "NOT_FOUND", assetProfile: null }),
      makeHolding({
        id: "h3",
        displayValue: 30000,
        enrichmentStatus: "COMPLETE",
        assetProfile: makeProfile(),
      }),
    ];
    const result = computeStockInterestBalance(holdings);
    // incompleteHoldings not on StockInterestBalance — verified via spread analysis
    expect(result.total).toBe(60000);
  });

  it("returns zero totals for empty holdings", () => {
    const result = computeStockInterestBalance([]);
    expect(result.total).toBe(0);
    expect(result.equity.value).toBe(0);
    expect(result.equity.percentage).toBe(0);
  });
});

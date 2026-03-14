import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDatabase, testPrisma } from "../helpers/db";
import { getHoldings } from "@/actions/holdings";
import { computeStockInterestBalance, computeSectorSpread, computeGeographicSpread } from "@/lib/spread";

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

beforeEach(async () => {
  await resetDatabase();
});

async function createProfileAndHolding(opts: {
  instrumentType: "STOCK" | "FUND";
  sector?: string;
  country?: string;
  fundCategory?: string;
  equityPct?: number;
  bondPct?: number;
  sectorWeightings?: Record<string, number>;
  geographicWeightings?: Record<string, number>;
  accountName?: string;
  identifier: string;
  shares?: number;
  pricePerShare?: number;
  currentValue?: number;
  enrichmentStatus?: string;
}) {
  const profile = await testPrisma.assetProfile.create({
    data: {
      instrumentType: opts.instrumentType,
      sector: opts.sector ?? null,
      country: opts.country ?? null,
      fundCategory: opts.fundCategory ?? null,
      equityPct: opts.equityPct ?? null,
      bondPct: opts.bondPct ?? null,
      sectorWeightings: opts.sectorWeightings ? JSON.stringify(opts.sectorWeightings) : null,
      geographicWeightings: opts.geographicWeightings ? JSON.stringify(opts.geographicWeightings) : null,
      fieldSources: "{}",
    },
  });

  await testPrisma.holding.create({
    data: {
      instrumentIdentifier: opts.identifier,
      instrumentType: opts.instrumentType,
      accountName: opts.accountName ?? "Test Account",
      shares: opts.shares ?? null,
      pricePerShare: opts.pricePerShare ?? null,
      currentValue: opts.currentValue ?? null,
      enrichmentStatus: opts.enrichmentStatus ?? "COMPLETE",
      assetProfileId: profile.id,
      lastUpdated: new Date(),
    },
  });
}

describe("spread computations over real SQLite data", () => {
  it("computes stock/interest balance for mixed portfolio", async () => {
    await createProfileAndHolding({
      instrumentType: "STOCK",
      identifier: "DNB",
      shares: 100,
      pricePerShare: 200,
    });
    await createProfileAndHolding({
      instrumentType: "FUND",
      identifier: "BOND_FUND",
      fundCategory: "BOND",
      currentValue: 50000,
    });

    const result = await getHoldings();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const balance = computeStockInterestBalance(result.data);
    expect(balance.equity.value).toBe(20000); // 100 * 200
    expect(balance.interest.value).toBe(50000);
    expect(balance.total).toBe(70000);
  });

  it("computes sector spread with account filter", async () => {
    await createProfileAndHolding({
      instrumentType: "STOCK",
      identifier: "DNB",
      sector: "Financials",
      accountName: "Account A",
      shares: 100,
      pricePerShare: 200,
    });
    await createProfileAndHolding({
      instrumentType: "STOCK",
      identifier: "EQNR",
      sector: "Energy",
      accountName: "Account B",
      shares: 50,
      pricePerShare: 300,
    });

    const filtered = await getHoldings({ accountName: "Account A" });
    expect(filtered.success).toBe(true);
    if (!filtered.success) return;

    const spread = computeSectorSpread(filtered.data);
    expect(spread.buckets.length).toBe(1);
    expect(spread.buckets[0].name).toBe("Financials");
    expect(spread.buckets[0].value).toBe(20000);
  });

  it("computes geographic spread with fund weightings", async () => {
    await createProfileAndHolding({
      instrumentType: "FUND",
      identifier: "GLOBAL_FUND",
      geographicWeightings: { Norway: 40, Europe: 60 },
      currentValue: 100000,
    });

    const result = await getHoldings();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const spread = computeGeographicSpread(result.data);
    const norway = spread.buckets.find((b) => b.name === "Norway");
    const europe = spread.buckets.find((b) => b.name === "Europe");
    expect(norway?.value).toBeCloseTo(40000);
    expect(europe?.value).toBeCloseTo(60000);
  });

  it("shows Unclassified for holdings without enrichment data", async () => {
    await createProfileAndHolding({
      instrumentType: "STOCK",
      identifier: "UNKNOWN",
      shares: 100,
      pricePerShare: 100,
      enrichmentStatus: "NOT_FOUND",
    });

    const result = await getHoldings();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const spread = computeSectorSpread(result.data);
    const unc = spread.buckets.find((b) => b.isUnclassified);
    expect(unc?.value).toBe(10000);
    expect(spread.incompleteHoldings).toBe(1);
  });
});

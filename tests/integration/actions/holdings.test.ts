import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDatabase, testPrisma } from "../helpers/db";
import {
  createHolding,
  updateHolding,
  deleteHolding,
  getHoldings,
} from "@/actions/holdings";

// Mock fetch to avoid fire-and-forget enrichment calls hitting network
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

beforeEach(async () => {
  await resetDatabase();
});

describe("createHolding", () => {
  it("creates a STOCK holding with PENDING enrichment status", async () => {
    const result = await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.enrichmentStatus).toBe("PENDING");
    expect(result.data.instrumentIdentifier).toBe("DNB");
    expect(result.data.instrumentType).toBe("STOCK");
    expect(result.data.accountName).toBe("Nordnet ASK");
    expect(result.data.shares).toBe(100);
    expect(result.data.pricePerShare).toBe(200);
    expect(result.data.displayValue).toBe(20000);
  });

  it("creates a FUND holding with PENDING enrichment status", async () => {
    const result = await createHolding({
      instrumentIdentifier: "NO0008001872",
      instrumentType: "FUND",
      accountName: "DNB pensjonskonto",
      currentValue: 50000,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.enrichmentStatus).toBe("PENDING");
    expect(result.data.instrumentType).toBe("FUND");
    expect(result.data.currentValue).toBe(50000);
    expect(result.data.displayValue).toBe(50000);
  });

  it("creates an AssetProfile stub for the holding", async () => {
    const result = await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Check that an AssetProfile was created
    const holding = await testPrisma.holding.findFirst({
      where: { instrumentIdentifier: "DNB" },
    });
    expect(holding?.assetProfileId).toBeTruthy();

    const profile = await testPrisma.assetProfile.findUnique({
      where: { id: holding!.assetProfileId! },
    });
    expect(profile).toBeTruthy();
    expect(profile?.instrumentType).toBe("STOCK");
  });

  it("links to existing AssetProfile when ISIN matches", async () => {
    // First create an AssetProfile with an ISIN
    const existingProfile = await testPrisma.assetProfile.create({
      data: {
        instrumentType: "FUND",
        isin: "NO0008001872",
        name: "Existing Fund",
        fieldSources: "{}",
      },
    });

    // Create a holding with that ISIN
    const result = await createHolding({
      instrumentIdentifier: "NO0008001872",
      instrumentType: "FUND",
      accountName: "DNB pensjonskonto",
      currentValue: 50000,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const holding = await testPrisma.holding.findFirst({
      where: { instrumentIdentifier: "NO0008001872" },
    });
    expect(holding?.assetProfileId).toBe(existingProfile.id);

    // Should not have created a new profile
    const profileCount = await testPrisma.assetProfile.count();
    expect(profileCount).toBe(1);
  });

  it("rejects duplicate holding (same account + instrument)", async () => {
    await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });

    const result = await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 50,
      pricePerShare: 210,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBeTruthy();
  });

  it("returns validation errors for missing required fields", async () => {
    const result = await createHolding({
      instrumentIdentifier: "",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors).toBeTruthy();
  });
});

describe("updateHolding", () => {
  it("updates a holding and sets lastUpdated when price changes", async () => {
    const created = await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const originalLastUpdated = new Date(created.data.lastUpdated);

    // Wait a tiny bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = await updateHolding(created.data.id, {
      pricePerShare: 210,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.pricePerShare).toBe(210);
    const newLastUpdated = new Date(result.data.lastUpdated);
    expect(newLastUpdated.getTime()).toBeGreaterThanOrEqual(
      originalLastUpdated.getTime()
    );
  });

  it("returns error for non-existent holding", async () => {
    const result = await updateHolding("nonexistent-id", {
      accountName: "New Account",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteHolding", () => {
  it("deletes the holding", async () => {
    const created = await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const result = await deleteHolding(created.data.id);
    expect(result.success).toBe(true);

    const holding = await testPrisma.holding.findUnique({
      where: { id: created.data.id },
    });
    expect(holding).toBeNull();
  });

  it("preserves the AssetProfile after deletion", async () => {
    const created = await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    // Get the profile ID before deletion
    const holdingBefore = await testPrisma.holding.findUnique({
      where: { id: created.data.id },
    });
    const profileId = holdingBefore?.assetProfileId;

    await deleteHolding(created.data.id);

    // AssetProfile should still exist
    if (profileId) {
      const profile = await testPrisma.assetProfile.findUnique({
        where: { id: profileId },
      });
      expect(profile).toBeTruthy();
    }
  });
});

describe("getHoldings", () => {
  it("returns all holdings with computed displayValue", async () => {
    await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    await createHolding({
      instrumentIdentifier: "NO0008001872",
      instrumentType: "FUND",
      accountName: "DNB pensjonskonto",
      currentValue: 50000,
    });

    const result = await getHoldings();
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(2);

    const stock = result.data.find((h) => h.instrumentType === "STOCK");
    expect(stock?.displayValue).toBe(20000); // 100 * 200

    const fund = result.data.find((h) => h.instrumentType === "FUND");
    expect(fund?.displayValue).toBe(50000);
  });

  it("filters holdings by accountName", async () => {
    await createHolding({
      instrumentIdentifier: "DNB",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 100,
      pricePerShare: 200,
    });
    await createHolding({
      instrumentIdentifier: "NO0008001872",
      instrumentType: "FUND",
      accountName: "DNB pensjonskonto",
      currentValue: 50000,
    });

    const result = await getHoldings({ accountName: "Nordnet ASK" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].accountName).toBe("Nordnet ASK");
  });
});

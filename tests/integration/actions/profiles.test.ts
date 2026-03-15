import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDatabase, testPrisma } from "../helpers/db";
import { updateProfileField, refreshProfile } from "@/actions/profiles";
import { mergeProfileFields } from "@/lib/enrichment/types";
import type { FieldSources } from "@/types";

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

describe("updateProfileField", () => {
  it("saves field value and sets source to user", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: { instrumentType: "STOCK", fieldSources: "{}" },
    });

    const result = await updateProfileField(profile.id, "sector", "Financials");
    expect(result.success).toBe(true);

    const updated = await testPrisma.assetProfile.findUnique({ where: { id: profile.id } });
    expect(updated?.sector).toBe("Financials");

    const sources = JSON.parse(updated?.fieldSources ?? "{}") as FieldSources;
    expect(sources.sector?.source).toBe("user");
  });

  it("preserves user-supplied field through enrichment merge", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: {
        instrumentType: "STOCK",
        sector: "Financials",
        fieldSources: JSON.stringify({
          sector: { source: "user", enrichedAt: new Date().toISOString() },
        }),
      },
    });

    // Simulate enrichment trying to overwrite the user-supplied sector
    const existingFieldSources = { sector: { source: "user" as const, enrichedAt: new Date().toISOString() } };
    const { fields } = mergeProfileFields(
      { sector: "Financials" },
      { sector: "Technology" }, // enrichment wants to change this
      existingFieldSources,
      "enrichment"
    );

    // The user-supplied sector should NOT be in merged fields
    expect(fields.sector).toBeUndefined();
  });

  it("saves JSON field sectorWeightings correctly", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: { instrumentType: "FUND", fieldSources: "{}" },
    });

    const weightings = { Technology: 40, Financials: 60 };
    const result = await updateProfileField(profile.id, "sectorWeightings", weightings);
    expect(result.success).toBe(true);

    const updated = await testPrisma.assetProfile.findUnique({ where: { id: profile.id } });
    const parsed = JSON.parse(updated?.sectorWeightings ?? "{}");
    expect(parsed).toEqual(weightings);
  });

  it("returns error for invalid field name", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: { instrumentType: "STOCK", fieldSources: "{}" },
    });

    const result = await updateProfileField(profile.id, "notARealField", "value");
    expect(result.success).toBe(false);
  });
});

describe("refreshProfile", () => {
  it("sets all linked holdings to PENDING", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: {
        instrumentType: "STOCK",
        sector: "Financials",
        fieldSources: "{}",
      },
    });

    await testPrisma.holding.create({
      data: {
        instrumentIdentifier: "DNB",
        instrumentType: "STOCK",
        accountName: "Nordnet ASK",
        shares: 100,
        pricePerShare: 200,
        enrichmentStatus: "COMPLETE",
        assetProfileId: profile.id,
        lastUpdated: new Date(),
      },
    });

    const result = await refreshProfile(profile.id);
    expect(result.success).toBe(true);

    const holding = await testPrisma.holding.findFirst({
      where: { assetProfileId: profile.id },
    });
    expect(holding?.enrichmentStatus).toBe("PENDING");
  });

  it("fires enrichment fetch for the profile", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: { instrumentType: "STOCK", fieldSources: "{}" },
    });

    await refreshProfile(profile.id);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/enrichment"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("preserves user-supplied fields through enrichment merge after refresh", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: {
        instrumentType: "STOCK",
        sector: "UserSector",
        name: "Enriched Name",
        fieldSources: JSON.stringify({
          sector: { source: "user", enrichedAt: new Date().toISOString() },
          name: { source: "enrichment", enrichedAt: new Date().toISOString() },
        }),
      },
    });

    const existingFieldSources: FieldSources = {
      sector: { source: "user", enrichedAt: new Date().toISOString() },
      name: { source: "enrichment", enrichedAt: new Date().toISOString() },
    };

    // Simulate refresh enrichment overwriting enrichment fields but not user
    const { fields, fieldSources } = mergeProfileFields(
      { sector: "UserSector", name: "Enriched Name" },
      { sector: "NewSector", name: "New Name" },
      existingFieldSources,
      "enrichment"
    );

    // sector (user) should be preserved
    expect(fields.sector).toBeUndefined();
    expect(fieldSources.sector?.source).toBe("user");

    // name (enrichment) should be overwritten
    expect(fields.name).toBe("New Name");
    expect(fieldSources.name?.source).toBe("enrichment");
  });
});

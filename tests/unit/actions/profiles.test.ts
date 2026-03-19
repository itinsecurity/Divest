import { describe, it, expect, vi } from "vitest";
import { EDITABLE_PROFILE_FIELDS } from "@/lib/profileFields";

// Mock DB for unit tests — profiles tests mostly cover validation logic
vi.mock("@/lib/db", () => ({
  prisma: {
    assetProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    holding: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("EDITABLE_PROFILE_FIELDS", () => {
  it("includes expected editable fields", () => {
    expect(EDITABLE_PROFILE_FIELDS).toContain("name");
    expect(EDITABLE_PROFILE_FIELDS).toContain("sector");
    expect(EDITABLE_PROFILE_FIELDS).toContain("country");
    expect(EDITABLE_PROFILE_FIELDS).toContain("fundCategory");
    expect(EDITABLE_PROFILE_FIELDS).toContain("equityPct");
    expect(EDITABLE_PROFILE_FIELDS).toContain("sectorWeightings");
    expect(EDITABLE_PROFILE_FIELDS).toContain("geographicWeightings");
  });

  it("does not include internal fields", () => {
    expect(EDITABLE_PROFILE_FIELDS).not.toContain("id");
    expect(EDITABLE_PROFILE_FIELDS).not.toContain("createdAt");
    expect(EDITABLE_PROFILE_FIELDS).not.toContain("updatedAt");
    expect(EDITABLE_PROFILE_FIELDS).not.toContain("fieldSources");
  });
});

describe("updateProfileField validation", () => {
  it("rejects invalid field names", async () => {
    const { updateProfileField } = await import("@/actions/profiles");
    const { prisma } = await import("@/lib/db");

    vi.mocked(prisma.assetProfile.findUnique).mockResolvedValue({
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
      fieldSources: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateProfileField("p1", "invalidField", "value");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Invalid field");
  });

  it("returns error when profile not found", async () => {
    const { updateProfileField } = await import("@/actions/profiles");
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.assetProfile.findUnique).mockResolvedValue(null);

    const result = await updateProfileField("nonexistent", "sector", "Financials");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("not found");
  });

  it("sets source to user when field is updated", async () => {
    const { updateProfileField } = await import("@/actions/profiles");
    const { prisma } = await import("@/lib/db");

    const existingProfile = {
      id: "p1",
      instrumentType: "STOCK",
      isin: null,
      ticker: null,
      name: "Test",
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
      fieldSources: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.assetProfile.findUnique).mockResolvedValue(existingProfile);
    vi.mocked(prisma.assetProfile.update).mockResolvedValue({
      ...existingProfile,
      sector: "Financials",
      fieldSources: JSON.stringify({ sector: { source: "user", enrichedAt: new Date().toISOString() } }),
    });

    const result = await updateProfileField("p1", "sector", "Financials");
    expect(result.success).toBe(true);

    // Check that update was called with user source
    expect(prisma.assetProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sector: "Financials",
        }),
      })
    );
  });
});

describe("refreshProfile validation", () => {
  it("returns error when profile not found", async () => {
    const { refreshProfile } = await import("@/actions/profiles");
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.assetProfile.findUnique).mockResolvedValue(null);

    const result = await refreshProfile("nonexistent");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("not found");
  });

  it("returns accepted status when profile exists", async () => {
    const { refreshProfile } = await import("@/actions/profiles");
    const { prisma } = await import("@/lib/db");

    vi.mocked(prisma.assetProfile.findUnique).mockResolvedValue({
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
      fieldSources: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.holding.updateMany).mockResolvedValue({ count: 1 });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const result = await refreshProfile("p1");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.status).toBe("accepted");
  });
});

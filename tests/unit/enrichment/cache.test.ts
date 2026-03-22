import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    enrichmentCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { getCached, setCached } from "@/lib/enrichment/cache";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.enrichmentCache.findUnique);
const mockUpsert = vi.mocked(prisma.enrichmentCache.upsert);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCached", () => {
  it("returns null on cache miss", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getCached("NO0010096985:STOCK");
    expect(result).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { cacheKey: "NO0010096985:STOCK" },
    });
  });

  it("returns null when entry is expired", async () => {
    mockFindUnique.mockResolvedValue({
      id: "c1",
      cacheKey: "NO0010096985:STOCK",
      data: JSON.stringify({ name: "Equinor" }),
      source: "euronext",
      expiresAt: new Date(Date.now() - 1000), // already expired
      createdAt: new Date(),
    });
    const result = await getCached("NO0010096985:STOCK");
    expect(result).toBeNull();
  });

  it("returns parsed data on a fresh cache hit", async () => {
    mockFindUnique.mockResolvedValue({
      id: "c1",
      cacheKey: "NO0010096985:STOCK",
      data: JSON.stringify({ name: "Equinor ASA", ticker: "EQNR" }),
      source: "euronext",
      expiresAt: new Date(Date.now() + 3_600_000), // 1 hour in the future
      createdAt: new Date(),
    });
    const result = await getCached("NO0010096985:STOCK");
    expect(result).toEqual({ name: "Equinor ASA", ticker: "EQNR" });
  });
});

describe("setCached", () => {
  it("writes a cache entry with the correct key and future expiresAt", async () => {
    mockUpsert.mockResolvedValue({} as never);
    await setCached("NO0010096985:STOCK", { name: "Equinor" }, "euronext");
    expect(mockUpsert).toHaveBeenCalledOnce();
    const call = mockUpsert.mock.calls[0][0];
    expect(call.where.cacheKey).toBe("NO0010096985:STOCK");
    expect(call.create.source).toBe("euronext");
    expect(call.create.data).toBe(JSON.stringify({ name: "Equinor" }));
    expect(new Date(call.create.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testPrisma, resetDatabase } from "../helpers/db";

// Mock the rate limiter so tests run fast
vi.mock("@/lib/enrichment/rate-limiter", () => ({
  waitForRateLimit: vi.fn().mockResolvedValue(undefined),
  resetRateLimiter: vi.fn(),
}));

// Mock the cache so tests are deterministic (no cache hits between tests)
vi.mock("@/lib/enrichment/cache", () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn().mockResolvedValue(undefined),
}));

// Mock the euronext sources
vi.mock("@/lib/enrichment/sources/euronext", () => ({
  euronextSource: {
    id: "euronext",
    supportedTypes: ["STOCK"],
    fetch: vi.fn(),
  },
  euronextFundSource: {
    id: "euronext-fund",
    supportedTypes: ["FUND"],
    fetch: vi.fn(),
  },
}));

// Mock the storebrand source
vi.mock("@/lib/enrichment/sources/storebrand", () => ({
  storebrandSource: {
    id: "storebrand",
    supportedTypes: ["FUND"],
    fetch: vi.fn(),
  },
}));

import { runPrimaryEnrichment } from "@/lib/enrichment/primary";
import { euronextSource } from "@/lib/enrichment/sources/euronext";
import { storebrandSource } from "@/lib/enrichment/sources/storebrand";

const mockEuronextFetch = vi.mocked(euronextSource.fetch);
const mockStorebrandFetch = vi.mocked(storebrandSource.fetch);

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  vi.mocked(
    (await import("@/lib/enrichment/cache")).getCached
  ).mockResolvedValue(null);
});

afterEach(async () => {
  await resetDatabase();
});

async function createStockProfile(identifier = "NO0010096985") {
  const profile = await testPrisma.assetProfile.create({
    data: { instrumentType: "STOCK", fieldSources: "{}" },
  });
  const holding = await testPrisma.holding.create({
    data: {
      instrumentIdentifier: identifier,
      instrumentType: "STOCK",
      accountName: "Test Account",
      enrichmentStatus: "PENDING",
      assetProfileId: profile.id,
      lastUpdated: new Date(),
    },
  });
  return { profile, holding };
}

// ─── US1: Unambiguous Stock Lookup ───────────────────────────────────────────

describe("US1: unambiguous stock enrichment", () => {
  it("updates profile with stock data from Euronext and sets PARTIAL status when sector/industry missing", async () => {
    const { profile, holding } = await createStockProfile();

    mockEuronextFetch.mockResolvedValue({
      status: "found",
      sourceId: "euronext",
      data: {
        name: "EQUINOR ASA",
        ticker: "EQNR",
        isin: "NO0010096985",
        exchange: "Oslo Bors",
        country: "Norway",
      },
    });

    await runPrimaryEnrichment(profile.id);

    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });

    expect(updatedProfile?.name).toBe("EQUINOR ASA");
    expect(updatedProfile?.ticker).toBe("EQNR");
    expect(updatedProfile?.isin).toBe("NO0010096985");
    expect(updatedProfile?.exchange).toBe("Oslo Bors");
    expect(updatedProfile?.country).toBe("Norway");

    // sector/industry absent → PARTIAL
    expect(updatedHolding?.enrichmentStatus).toBe("PARTIAL");
  });

  it("sets COMPLETE when all stock fields are populated", async () => {
    const { profile, holding } = await createStockProfile();

    mockEuronextFetch.mockResolvedValue({
      status: "found",
      sourceId: "euronext",
      data: {
        name: "EQUINOR ASA",
        ticker: "EQNR",
        isin: "NO0010096985",
        exchange: "Oslo Bors",
        country: "Norway",
        sector: "Energy",
        industry: "Oil & Gas",
      },
    });

    await runPrimaryEnrichment(profile.id);

    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("COMPLETE");
  });

  it("sets NOT_FOUND when all sources return not_found", async () => {
    const { profile, holding } = await createStockProfile("ZZZNOMATCH");

    mockEuronextFetch.mockResolvedValue({ status: "not_found" });

    await runPrimaryEnrichment(profile.id);

    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("NOT_FOUND");
  });

  it("skips re-enrichment of COMPLETE holdings", async () => {
    const profile = await testPrisma.assetProfile.create({
      data: {
        instrumentType: "STOCK",
        name: "Already Complete",
        ticker: "AC",
        isin: "NO0001234567",
        exchange: "Oslo Bors",
        country: "Norway",
        sector: "Finance",
        industry: "Banking",
        fieldSources: "{}",
      },
    });
    await testPrisma.holding.create({
      data: {
        instrumentIdentifier: "NO0001234567",
        instrumentType: "STOCK",
        accountName: "Test",
        enrichmentStatus: "COMPLETE",
        assetProfileId: profile.id,
        lastUpdated: new Date(),
      },
    });

    await runPrimaryEnrichment(profile.id);

    // euronext should NOT have been called
    expect(mockEuronextFetch).not.toHaveBeenCalled();
  });

  it("uses cache when a fresh entry exists", async () => {
    const { profile } = await createStockProfile();

    const cachedData = { name: "Cached Name", ticker: "CACHE" };
    vi.mocked(
      (await import("@/lib/enrichment/cache")).getCached
    ).mockResolvedValueOnce(cachedData);

    await runPrimaryEnrichment(profile.id);

    expect(mockEuronextFetch).not.toHaveBeenCalled();
    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    expect(updatedProfile?.name).toBe("Cached Name");
  });
});

async function createFundProfile(identifier = "NO0010817851") {
  const profile = await testPrisma.assetProfile.create({
    data: { instrumentType: "FUND", isin: identifier, fieldSources: "{}" },
  });
  const holding = await testPrisma.holding.create({
    data: {
      instrumentIdentifier: identifier,
      instrumentType: "FUND",
      accountName: "Test Account",
      enrichmentStatus: "PENDING",
      assetProfileId: profile.id,
      lastUpdated: new Date(),
    },
  });
  return { profile, holding };
}

// ─── US2: Unambiguous Fund Lookup ────────────────────────────────────────────

describe("US2: fund enrichment via Storebrand", () => {
  it("updates profile with fund data and sets COMPLETE when all fund fields populated", async () => {
    const { profile, holding } = await createFundProfile();

    mockStorebrandFetch.mockResolvedValue({
      status: "found",
      sourceId: "storebrand",
      data: {
        fundManager: "Storebrand Asset Management",
        fundCategory: "EQUITY",
        equityPct: 96.5,
        bondPct: 3.5,
        sectorWeightings: { Technology: 28, Financials: 18 },
        geographicWeightings: { "United States": 65, Europe: 15 },
      },
    });

    await runPrimaryEnrichment(profile.id);

    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });

    expect(updatedProfile?.fundManager).toBe("Storebrand Asset Management");
    expect(updatedProfile?.fundCategory).toBe("EQUITY");
    expect(Number(updatedProfile?.equityPct)).toBeCloseTo(96.5);
    expect(Number(updatedProfile?.bondPct)).toBeCloseTo(3.5);
    expect(updatedHolding?.enrichmentStatus).toBe("COMPLETE");
  });

  it("sets PARTIAL when some fund fields are missing", async () => {
    const { profile, holding } = await createFundProfile();

    mockStorebrandFetch.mockResolvedValue({
      status: "found",
      sourceId: "storebrand",
      data: {
        fundManager: "Storebrand Asset Management",
        fundCategory: "EQUITY",
        // equityPct and bondPct missing
      },
    });

    await runPrimaryEnrichment(profile.id);

    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("PARTIAL");
  });

  it("sets NOT_FOUND when Storebrand returns not_found", async () => {
    const { profile, holding } = await createFundProfile();

    mockStorebrandFetch.mockResolvedValue({ status: "not_found" });

    await runPrimaryEnrichment(profile.id);

    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("NOT_FOUND");
  });

  it("does not call Euronext for FUND type", async () => {
    const { profile } = await createFundProfile();

    mockStorebrandFetch.mockResolvedValue({ status: "not_found" });

    await runPrimaryEnrichment(profile.id);

    expect(mockEuronextFetch).not.toHaveBeenCalled();
  });
});

// ─── US4: Multi-Source Fallback ──────────────────────────────────────────────

describe("US4: multi-source fallback for funds", () => {
  it("falls back to euronext-fund source when storebrand returns not_found", async () => {
    const { profile, holding } = await createFundProfile();

    // Storebrand fails
    mockStorebrandFetch.mockResolvedValue({ status: "not_found" });

    // Euronext fund list succeeds with basic data
    const { euronextFundSource } = await import(
      "@/lib/enrichment/sources/euronext"
    );
    vi.mocked(euronextFundSource.fetch).mockResolvedValue({
      status: "found",
      sourceId: "euronext-fund",
      data: {
        name: "Storebrand Global Indeks A",
        ticker: "SGLOBAL",
        isin: "NO0010817851",
        exchange: "Oslo Bors",
        country: "Norway",
      },
    });

    await runPrimaryEnrichment(profile.id);

    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });

    expect(updatedProfile?.name).toBe("Storebrand Global Indeks A");
    // Fund-specific fields absent → PARTIAL
    expect(updatedHolding?.enrichmentStatus).toBe("PARTIAL");
  });

  it("retries once on retryable error then succeeds", async () => {
    const { profile, holding } = await createStockProfile();

    // First call: retryable error; second call: found
    mockEuronextFetch
      .mockResolvedValueOnce({ status: "error", retryable: true, message: "timeout" })
      .mockResolvedValueOnce({
        status: "found",
        sourceId: "euronext",
        data: { name: "EQUINOR ASA", ticker: "EQNR", isin: "NO0010096985", exchange: "Oslo Bors", country: "Norway" },
      });

    await runPrimaryEnrichment(profile.id);

    expect(mockEuronextFetch).toHaveBeenCalledTimes(2);
    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    expect(updatedProfile?.ticker).toBe("EQNR");
  });
});

// ─── US5: Web Search Fallback ─────────────────────────────────────────────────

vi.mock("@/lib/enrichment/search-fallback", () => ({
  searchFallback: vi.fn().mockResolvedValue(null),
}));

describe("US5: web search fallback", () => {
  it("sets NOT_FOUND gracefully when SERPER_API_KEY is not set and all sources fail", async () => {
    const { profile, holding } = await createStockProfile("ZZZNOMATCH");

    mockEuronextFetch.mockResolvedValue({ status: "not_found" });
    // searchFallback mock returns null (no API key scenario)
    const { searchFallback: mockSearchFallback } = await import(
      "@/lib/enrichment/search-fallback"
    );
    vi.mocked(mockSearchFallback).mockResolvedValue(null);

    await runPrimaryEnrichment(profile.id);

    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("NOT_FOUND");
  });

  it("applies data from web search fallback when all sources return not_found", async () => {
    const { profile, holding } = await createStockProfile("ZZZNOMATCH");

    mockEuronextFetch.mockResolvedValue({ status: "not_found" });
    const { searchFallback: mockSearchFallback } = await import(
      "@/lib/enrichment/search-fallback"
    );
    vi.mocked(mockSearchFallback).mockResolvedValue({ name: "Fallback Corp" });

    await runPrimaryEnrichment(profile.id);

    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    expect(updatedProfile?.name).toBe("Fallback Corp");
    // Only name found → PARTIAL
    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("PARTIAL");
  });
});

// ─── US3: NEEDS_INPUT (disambiguation) ───────────────────────────────────────

describe("US3: disambiguation — NEEDS_INPUT", () => {
  it("sets NEEDS_INPUT and persists candidates when multiple comparably scored results", async () => {
    const { profile, holding } = await createStockProfile("STOREBRAND");

    mockEuronextFetch.mockResolvedValue({
      status: "multiple",
      candidates: [
        {
          name: "STOREBRAND ASA",
          ticker: "STB",
          isin: "NO0001234567",
          exchange: "Oslo Bors",
          instrumentType: "STOCK",
          sourceId: "euronext",
          rawData: {},
          score: 20,
        },
        {
          name: "STOREBRAND AB",
          ticker: "STB2",
          isin: "SE0001234567",
          exchange: "Stockholm",
          instrumentType: "STOCK",
          sourceId: "euronext",
          rawData: {},
          score: 20,
        },
      ],
    });

    await runPrimaryEnrichment(profile.id);

    const updatedHolding = await testPrisma.holding.findUnique({
      where: { id: holding.id },
    });
    expect(updatedHolding?.enrichmentStatus).toBe("NEEDS_INPUT");

    const candidates = await testPrisma.enrichmentCandidate.findMany({
      where: { assetProfileId: profile.id },
    });
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.name)).toContain("STOREBRAND ASA");
    expect(candidates.map((c) => c.name)).toContain("STOREBRAND AB");
  });

  it("does not update profile fields when NEEDS_INPUT", async () => {
    const { profile } = await createStockProfile("STOREBRAND");

    mockEuronextFetch.mockResolvedValue({
      status: "multiple",
      candidates: [
        {
          name: "STOREBRAND ASA",
          ticker: "STB",
          isin: null,
          exchange: null,
          instrumentType: "STOCK",
          sourceId: "euronext",
          rawData: {},
          score: 20,
        },
        {
          name: "STOREBRAND GLOBAL",
          ticker: "STBG",
          isin: null,
          exchange: null,
          instrumentType: "STOCK",
          sourceId: "euronext",
          rawData: {},
          score: 20,
        },
      ],
    });

    await runPrimaryEnrichment(profile.id);

    const updatedProfile = await testPrisma.assetProfile.findUnique({
      where: { id: profile.id },
    });
    // Profile should not have been updated
    expect(updatedProfile?.name).toBeNull();
    expect(updatedProfile?.ticker).toBeNull();
  });
});

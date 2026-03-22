import { prisma } from "@/lib/db";
import { mergeProfileFields, type AssetProfileUpdateData } from "./types";
import { normalizeIdentifier } from "./normalizer";
import { getCached, setCached } from "./cache";
import { scoreCandidate, shouldAutoSelect } from "./candidates";
import type { FieldSources } from "@/types";
import type { SourceResult, CandidateData, DataSource } from "./sources/registry";
import { Prisma } from "@prisma/client";
import { searchFallback } from "./search-fallback";

// Source imports — populated incrementally as phases complete
import { euronextSource, euronextFundSource } from "./sources/euronext";
import { storebrandSource } from "./sources/storebrand";

// Ordered list of data sources (priority 1 = first tried)
const SOURCES: DataSource[] = [euronextSource, storebrandSource, euronextFundSource];

/** Fields required for COMPLETE status per instrument type */
const STOCK_REQUIRED_FIELDS = [
  "name",
  "ticker",
  "isin",
  "exchange",
  "country",
  "sector",
  "industry",
] as const;

const FUND_REQUIRED_FIELDS = [
  "name",
  "fundManager",
  "fundCategory",
  "equityPct",
  "bondPct",
] as const;

function determineStatus(
  data: Partial<AssetProfileUpdateData>,
  instrumentType: string
): "COMPLETE" | "PARTIAL" | "NOT_FOUND" {
  const required =
    instrumentType === "STOCK"
      ? STOCK_REQUIRED_FIELDS
      : (FUND_REQUIRED_FIELDS as unknown as readonly (keyof AssetProfileUpdateData)[]);

  const populated = (required as readonly string[]).filter(
    (f) => data[f as keyof AssetProfileUpdateData] != null
  );

  if (populated.length === 0) return "NOT_FOUND";
  if (populated.length === required.length) return "COMPLETE";
  return "PARTIAL";
}

function parseFieldSources(raw: string | null): FieldSources {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as FieldSources;
  } catch {
    return {};
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function trySourceWithRetry(
  source: DataSource,
  identifier: ReturnType<typeof normalizeIdentifier>,
  instrumentType: "STOCK" | "FUND"
): Promise<SourceResult> {
  const result = await source.fetch(identifier, instrumentType);
  if (result.status === "error" && result.retryable) {
    // Retry once after 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return source.fetch(identifier, instrumentType);
  }
  return result;
}

async function persistCandidates(
  assetProfileId: string,
  candidates: CandidateData[]
): Promise<void> {
  await prisma.enrichmentCandidate.createMany({
    data: candidates.map((c) => ({
      assetProfileId,
      name: c.name,
      ticker: c.ticker,
      isin: c.isin,
      exchange: c.exchange,
      instrumentType: c.instrumentType,
      sourceId: c.sourceId,
      rawData: JSON.stringify(c.rawData),
      score: c.score,
    })),
  });
}

export async function runPrimaryEnrichment(profileId: string): Promise<void> {
  // 1. Load the profile and check if enrichment should be skipped
  const profile = await prisma.assetProfile.findUnique({
    where: { id: profileId },
    include: { holdings: { select: { id: true, enrichmentStatus: true } } },
  });

  if (!profile) return;

  // Skip if all linked holdings are already COMPLETE (unless caller forces refresh)
  const allComplete = profile.holdings.every(
    (h) => h.enrichmentStatus === "COMPLETE"
  );
  if (allComplete && profile.holdings.length > 0) return;

  // 2. Determine identifier from existing profile data or holdings
  const holdingIdentifier = await prisma.holding.findFirst({
    where: { assetProfileId: profileId },
    select: { instrumentIdentifier: true },
  });
  const rawIdentifier =
    profile.isin ??
    profile.ticker ??
    holdingIdentifier?.instrumentIdentifier ??
    "";

  const identifier = normalizeIdentifier(rawIdentifier);
  const instrumentType = profile.instrumentType as "STOCK" | "FUND";
  const cacheKey = `${identifier.normalized.toLowerCase()}:${instrumentType}`;

  // 3. Check cache
  const cached = await getCached(cacheKey);
  if (cached) {
    const existing = extractExistingData(profile);
    const existingFieldSources = parseFieldSources(profile.fieldSources as string);
    const { fields, fieldSources } = mergeProfileFields(
      existing,
      cached,
      existingFieldSources,
      "enrichment"
    );
    const status = determineStatus({ ...existing, ...fields }, instrumentType);
    await applyToDatabase(profileId, fields, fieldSources, status);
    return;
  }

  // 4. Try each source in priority order
  let enrichedData: Partial<AssetProfileUpdateData> | null = null;
  const applicableSources = SOURCES.filter((s) =>
    s.supportedTypes.includes(instrumentType)
  );

  for (const source of applicableSources) {
    // Each source calls waitForRateLimit internally with its actual URL
    const result = await trySourceWithRetry(source, identifier, instrumentType);

    if (result.status === "not_found") continue;

    if (result.status === "error") {
      console.error(
        `Enrichment source ${source.id} error for profile ${profileId}: ${result.message}`
      );
      continue;
    }

    if (result.status === "multiple") {
      // Score and try auto-select
      const scored = result.candidates.map((c) => ({
        ...c,
        score: c.score > 0 ? c.score : scoreCandidate(c, identifier),
      }));
      const autoSelected = shouldAutoSelect(scored);

      if (autoSelected) {
        // Treat as found
        enrichedData = {
          name: autoSelected.name,
          ticker: autoSelected.ticker,
          isin: autoSelected.isin,
          exchange: autoSelected.exchange,
          country: null,
        };
        await setCached(cacheKey, enrichedData, source.id);
        break;
      }

      // Disambiguation required
      await persistCandidates(profileId, scored);
      await prisma.holding.updateMany({
        where: { assetProfileId: profileId },
        data: { enrichmentStatus: "NEEDS_INPUT" },
      });
      return;
    }

    if (result.status === "found") {
      enrichedData = result.data;
      await setCached(cacheKey, enrichedData, source.id);
      break;
    }
  }

  // 5. No source returned data — try web search fallback if configured
  if (!enrichedData) {
    const fallbackData = await searchFallback(identifier, instrumentType);
    if (fallbackData) {
      enrichedData = fallbackData;
      await setCached(cacheKey, enrichedData, "search-fallback");
    } else {
      await prisma.holding.updateMany({
        where: { assetProfileId: profileId },
        data: { enrichmentStatus: "NOT_FOUND" },
      });
      return;
    }
  }

  // 6. Merge and apply
  const existing = extractExistingData(profile);
  const existingFieldSources = parseFieldSources(profile.fieldSources as string);
  const { fields, fieldSources } = mergeProfileFields(
    existing,
    enrichedData,
    existingFieldSources,
    "enrichment"
  );

  const status = determineStatus({ ...existing, ...fields }, instrumentType);
  await applyToDatabase(profileId, fields, fieldSources, status);
}

function extractExistingData(profile: {
  name: string | null;
  ticker: string | null;
  isin: string | null;
  exchange: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
  fundManager: string | null;
  fundCategory: string | null;
  equityPct: Prisma.Decimal | null;
  bondPct: Prisma.Decimal | null;
  sectorWeightings: unknown;
  geographicWeightings: unknown;
}): Partial<AssetProfileUpdateData> {
  return {
    name: profile.name,
    ticker: profile.ticker,
    isin: profile.isin,
    exchange: profile.exchange,
    country: profile.country,
    sector: profile.sector,
    industry: profile.industry,
    fundManager: profile.fundManager,
    fundCategory: profile.fundCategory,
    equityPct: profile.equityPct
      ? (profile.equityPct as Prisma.Decimal).toNumber()
      : null,
    bondPct: profile.bondPct
      ? (profile.bondPct as Prisma.Decimal).toNumber()
      : null,
    sectorWeightings: parseJson<Record<string, number>>(
      profile.sectorWeightings as string | null
    ),
    geographicWeightings: parseJson<Record<string, number>>(
      profile.geographicWeightings as string | null
    ),
  };
}

async function applyToDatabase(
  profileId: string,
  fields: Partial<AssetProfileUpdateData>,
  fieldSources: FieldSources,
  status: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    fieldSources: JSON.stringify(fieldSources),
  };

  for (const [key, value] of Object.entries(fields)) {
    if (key === "sectorWeightings" || key === "geographicWeightings") {
      updateData[key] = value ? JSON.stringify(value) : null;
    } else if (key === "equityPct" || key === "bondPct") {
      updateData[key] = value !== null ? new Prisma.Decimal(value as number) : null;
    } else {
      updateData[key] = value;
    }
  }

  await prisma.assetProfile.update({
    where: { id: profileId },
    data: updateData,
  });

  await prisma.holding.updateMany({
    where: { assetProfileId: profileId },
    data: { enrichmentStatus: status },
  });
}

// Legacy exports preserved for backward compatibility with existing tests
export { detectISIN } from "./normalizer";
export type { EnrichmentData } from "./types";
export { buildEnrichmentData } from "./types";
export { fetchFromEuronext } from "./sources/euronext-compat";

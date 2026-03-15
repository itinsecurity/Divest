import { prisma } from "@/lib/db";
import { mergeProfileFields, type AssetProfileUpdateData } from "./types";
import type { FieldSources } from "@/types";
import { Decimal } from "@prisma/client";

const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export function detectISIN(identifier: string): boolean {
  return ISIN_REGEX.test(identifier);
}

export type EnrichmentData = Partial<AssetProfileUpdateData>;

export function buildEnrichmentData(data: Partial<AssetProfileUpdateData>): Partial<AssetProfileUpdateData> {
  return { ...data };
}

/**
 * Attempt to fetch stock data from Euronext for an ISIN.
 * Returns enrichment data or null if not found.
 */
export async function fetchFromEuronext(
  isin: string
): Promise<Partial<AssetProfileUpdateData> | null> {
  try {
    // Euronext public API endpoint for instrument lookup
    const url = `https://live.euronext.com/en/pd/data/stocks?display=fragment&q=${isin}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Divest/1.0 (personal investment tracker)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    // The actual API response format varies; this is a stub parser
    // In production this would parse the actual Euronext response format
    const text = await response.text();

    // Try to extract basic info from the response
    // Real implementation would parse the actual API format
    if (!text || text.length === 0) {
      return null;
    }

    return null; // Stub — real parsing would go here
  } catch {
    return null;
  }
}

/**
 * Attempt to fetch fund data from common Norwegian fund company sites.
 * Returns enrichment data or null if not found.
 */
export async function fetchFundData(
  _identifier: string
): Promise<Partial<AssetProfileUpdateData> | null> {
  // Stub implementation — real fetchers for DNB, Storebrand, KLP, VFF would go here
  // Each fetcher would be rate-limited to ≤1 req/sec
  return null;
}

/**
 * Determine enrichment status based on how many fields are populated.
 */
function determineEnrichmentStatus(
  profileData: Partial<AssetProfileUpdateData>,
  instrumentType: string
): string {
  const stockFields = ["name", "ticker", "exchange", "country", "sector"];
  const fundFields = ["name", "fundCategory"];

  const relevantFields = instrumentType === "STOCK" ? stockFields : fundFields;
  const populated = relevantFields.filter(
    (f) => profileData[f as keyof AssetProfileUpdateData] != null
  );

  if (populated.length === 0) {
    return "NOT_FOUND";
  }
  if (populated.length === relevantFields.length) {
    return "COMPLETE";
  }
  return "PARTIAL";
}

/**
 * Run primary enrichment for a profile.
 * Fetches from public sources and updates the profile + linked holdings.
 */
export async function runPrimaryEnrichment(profileId: string): Promise<void> {
  // 1. Load the profile
  const profile = await prisma.assetProfile.findUnique({
    where: { id: profileId },
    include: { holdings: { select: { id: true } } },
  });

  if (!profile) {
    return;
  }

  // 2. Try to fetch data based on identifier
  let fetchedData: Partial<AssetProfileUpdateData> | null = null;

  if (profile.isin && detectISIN(profile.isin)) {
    fetchedData = await fetchFromEuronext(profile.isin);
  }

  // If no ISIN-based result, try ticker-based or fund data
  if (!fetchedData) {
    if (profile.instrumentType === "FUND") {
      const identifier = profile.isin ?? profile.ticker ?? "";
      fetchedData = await fetchFundData(identifier);
    }
  }

  // Rate limiting — simple sleep between requests
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Determine enrichment status
  const enrichmentStatus = determineEnrichmentStatus(
    fetchedData ?? {},
    profile.instrumentType
  );

  if (!fetchedData || Object.keys(fetchedData).length === 0) {
    // Nothing found — update status to NOT_FOUND
    await prisma.holding.updateMany({
      where: { assetProfileId: profileId },
      data: { enrichmentStatus: "NOT_FOUND" },
    });
    return;
  }

  // 4. Merge results
  const existingFieldSources = parseFieldSources(profile.fieldSources as string);

  const existingData: Partial<AssetProfileUpdateData> = {
    name: profile.name,
    ticker: profile.ticker,
    isin: profile.isin,
    exchange: profile.exchange,
    country: profile.country,
    sector: profile.sector,
    industry: profile.industry,
    fundManager: profile.fundManager,
    fundCategory: profile.fundCategory,
    equityPct: profile.equityPct ? (profile.equityPct as Decimal).toNumber() : null,
    bondPct: profile.bondPct ? (profile.bondPct as Decimal).toNumber() : null,
    sectorWeightings: parseJson<Record<string, number>>(profile.sectorWeightings as string | null),
    geographicWeightings: parseJson<Record<string, number>>(profile.geographicWeightings as string | null),
  };

  const { fields: mergedFields, fieldSources: updatedFieldSources } =
    mergeProfileFields(existingData, fetchedData, existingFieldSources, "enrichment");

  // 5. Update the profile
  const updateData: Record<string, unknown> = {
    fieldSources: JSON.stringify(updatedFieldSources),
  };

  for (const [key, value] of Object.entries(mergedFields)) {
    if (key === "sectorWeightings" || key === "geographicWeightings") {
      updateData[key] = value ? JSON.stringify(value) : null;
    } else if (key === "equityPct" || key === "bondPct") {
      updateData[key] = value !== null ? new Decimal(value as number) : null;
    } else {
      updateData[key] = value;
    }
  }

  await prisma.assetProfile.update({
    where: { id: profileId },
    data: updateData,
  });

  // 6. Update all linked holdings' enrichmentStatus
  await prisma.holding.updateMany({
    where: { assetProfileId: profileId },
    data: { enrichmentStatus },
  });
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

import type { FieldSources, FieldSourceEntry } from "@/types";

export type AssetProfileUpdateData = {
  name: string | null;
  ticker: string | null;
  isin: string | null;
  exchange: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
  fundManager: string | null;
  fundCategory: string | null;
  equityPct: number | null;
  bondPct: number | null;
  sectorWeightings: Record<string, number> | null;
  geographicWeightings: Record<string, number> | null;
};

export type EnrichmentData = Partial<AssetProfileUpdateData>;

export function buildEnrichmentData(
  data: Partial<AssetProfileUpdateData>
): Partial<AssetProfileUpdateData> {
  return { ...data };
}

type IncomingSource = "enrichment" | "ai_extraction";

/**
 * Source priority hierarchy (highest wins):
 * 1. user       — never overwritten
 * 2. enrichment — overwrites ai_extraction but not user
 * 3. ai_extraction — only fills truly empty fields
 */
function shouldApplyField(
  existingSource: FieldSourceEntry | undefined,
  incomingSource: IncomingSource
): boolean {
  if (!existingSource) {
    // Field has no source — always apply
    return true;
  }

  if (existingSource.source === "user") {
    // User-supplied fields are never overwritten
    return false;
  }

  if (incomingSource === "ai_extraction" && existingSource.source === "enrichment") {
    // ai_extraction cannot overwrite enrichment
    return false;
  }

  // enrichment can overwrite ai_extraction
  // enrichment can overwrite enrichment (refresh scenario)
  return true;
}

/**
 * Merges incoming profile fields into the existing profile, respecting source priority.
 * Returns the fields to update and the updated fieldSources.
 */
export function mergeProfileFields(
  existing: Partial<AssetProfileUpdateData>,
  incoming: Partial<AssetProfileUpdateData>,
  existingFieldSources: FieldSources,
  incomingSource: IncomingSource
): { fields: Partial<AssetProfileUpdateData>; fieldSources: FieldSources } {
  const fields: Partial<AssetProfileUpdateData> = {};
  const fieldSources: FieldSources = { ...existingFieldSources };

  const keys = Object.keys(incoming) as (keyof AssetProfileUpdateData)[];

  for (const key of keys) {
    const value = incoming[key];

    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }

    const existingSource = existingFieldSources[key];

    if (!shouldApplyField(existingSource, incomingSource)) {
      // Preserve existing source
      continue;
    }

    // Apply the field
    (fields as Record<string, unknown>)[key] = value;
    fieldSources[key] = {
      source: incomingSource,
      enrichedAt: new Date().toISOString(),
    };
  }

  return { fields, fieldSources };
}

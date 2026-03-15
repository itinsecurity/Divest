"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { ActionResult, FieldSources, AssetProfileData } from "@/types";

export const EDITABLE_PROFILE_FIELDS = [
  "name",
  "isin",
  "ticker",
  "exchange",
  "country",
  "sector",
  "industry",
  "fundManager",
  "fundCategory",
  "equityPct",
  "bondPct",
  "sectorWeightings",
  "geographicWeightings",
] as const;

type EditableField = (typeof EDITABLE_PROFILE_FIELDS)[number];

const JSON_FIELDS = new Set(["sectorWeightings", "geographicWeightings"]);
const NUMERIC_FIELDS = new Set(["equityPct", "bondPct"]);

function isEditableField(field: string): field is EditableField {
  return (EDITABLE_PROFILE_FIELDS as readonly string[]).includes(field);
}

/**
 * Update a single editable field on an asset profile.
 * Sets the field source to "user" so it won't be overwritten by enrichment.
 */
export async function updateProfileField(
  profileId: string,
  fieldName: string,
  value: unknown
): Promise<ActionResult<AssetProfileData>> {
  if (!isEditableField(fieldName)) {
    return { success: false, error: `Invalid field: "${fieldName}"` };
  }

  const profile = await prisma.assetProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    return { success: false, error: "Asset profile not found" };
  }

  let existingFieldSources: FieldSources = {};
  try {
    existingFieldSources = JSON.parse(profile.fieldSources) as FieldSources;
  } catch {
    existingFieldSources = {};
  }

  // Prepare the value for storage
  let storedValue: unknown = value;
  if (JSON_FIELDS.has(fieldName)) {
    storedValue = typeof value === "string" ? value : JSON.stringify(value);
  } else if (NUMERIC_FIELDS.has(fieldName)) {
    storedValue = typeof value === "string" ? Number(value) : value;
  }

  // Update field source to user
  const updatedSources: FieldSources = {
    ...existingFieldSources,
    [fieldName]: { source: "user", enrichedAt: new Date().toISOString() },
  };

  const updated = await prisma.assetProfile.update({
    where: { id: profileId },
    data: {
      [fieldName]: storedValue,
      fieldSources: JSON.stringify(updatedSources),
    },
  });

  revalidatePath(`/holdings`);

  return { success: true, data: toAssetProfileData(updated) };
}

/**
 * Trigger a re-enrichment of an asset profile.
 * Sets all linked holdings to PENDING and fires primary enrichment.
 */
export async function refreshProfile(
  profileId: string
): Promise<ActionResult<{ profileId: string; status: "accepted" }>> {
  const profile = await prisma.assetProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    return { success: false, error: "Asset profile not found" };
  }

  // Set all linked holdings to PENDING
  await prisma.holding.updateMany({
    where: { assetProfileId: profileId },
    data: { enrichmentStatus: "PENDING" },
  });

  // Fire-and-forget primary enrichment
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  void fetch(`${baseUrl}/api/enrichment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetProfileId: profileId, type: "primary" }),
  });

  revalidatePath("/holdings");

  return { success: true, data: { profileId, status: "accepted" } };
}

function toAssetProfileData(profile: {
  id: string;
  instrumentType: string;
  name: string | null;
  isin: string | null;
  ticker: string | null;
  exchange: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
  fundManager: string | null;
  fundCategory: string | null;
  equityPct: unknown;
  bondPct: unknown;
  sectorWeightings: string | null;
  geographicWeightings: string | null;
  fieldSources: string;
}): AssetProfileData {
  let fieldSources: FieldSources = {};
  try {
    fieldSources = JSON.parse(profile.fieldSources) as FieldSources;
  } catch {
    fieldSources = {};
  }

  return {
    id: profile.id,
    instrumentType: profile.instrumentType as AssetProfileData["instrumentType"],
    name: profile.name,
    isin: profile.isin,
    ticker: profile.ticker,
    exchange: profile.exchange,
    country: profile.country,
    sector: profile.sector,
    industry: profile.industry,
    fundManager: profile.fundManager,
    fundCategory: profile.fundCategory as AssetProfileData["fundCategory"],
    equityPct: profile.equityPct !== null ? Number(profile.equityPct) : null,
    bondPct: profile.bondPct !== null ? Number(profile.bondPct) : null,
    sectorWeightings: profile.sectorWeightings
      ? (JSON.parse(profile.sectorWeightings) as Record<string, number>)
      : null,
    geographicWeightings: profile.geographicWeightings
      ? (JSON.parse(profile.geographicWeightings) as Record<string, number>)
      : null,
    fieldSources,
  };
}

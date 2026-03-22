import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { enrichmentQueue } from "@/lib/enrichment/queue";
import { mergeProfileFields } from "@/lib/enrichment/types";
import type { AssetProfileUpdateData } from "@/lib/enrichment/types";
import type { FieldSources } from "@/types";
import { z } from "zod";

const resolveSchema = z.object({
  assetProfileId: z.string().min(1),
  candidateId: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { assetProfileId, candidateId } = parsed.data;

  // Load candidate and verify it belongs to the requested profile
  const candidate = await prisma.enrichmentCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate || candidate.assetProfileId !== assetProfileId) {
    return Response.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Parse the candidate's raw data and apply to the profile
  let rawData: Partial<AssetProfileUpdateData> = {};
  try {
    rawData = JSON.parse(candidate.rawData) as Partial<AssetProfileUpdateData>;
  } catch {
    // rawData unparseable — proceed with empty data; fields are still in candidate columns
  }

  // Merge candidate identifying fields (prioritise explicit columns over rawData)
  const candidateData: Partial<AssetProfileUpdateData> = {
    ...rawData,
    name: candidate.name ?? rawData.name ?? null,
    ticker: candidate.ticker ?? rawData.ticker ?? null,
    isin: candidate.isin ?? rawData.isin ?? null,
    exchange: candidate.exchange ?? rawData.exchange ?? null,
  };

  // Load existing profile for merge
  const profile = await prisma.assetProfile.findUnique({
    where: { id: assetProfileId },
  });
  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const existingFieldSources = (() => {
    try {
      return JSON.parse(profile.fieldSources as string) as FieldSources;
    } catch {
      return {} as FieldSources;
    }
  })();

  const { fields, fieldSources } = mergeProfileFields(
    {},
    candidateData,
    existingFieldSources,
    "enrichment"
  );

  // Apply to profile
  await prisma.assetProfile.update({
    where: { id: assetProfileId },
    data: {
      ...fields,
      fieldSources: JSON.stringify(fieldSources),
    },
  });

  // Delete all candidates for this profile
  await prisma.enrichmentCandidate.deleteMany({
    where: { assetProfileId },
  });

  // Reset holdings to PENDING so enrichment re-runs
  await prisma.holding.updateMany({
    where: { assetProfileId },
    data: { enrichmentStatus: "PENDING" },
  });

  // Re-enqueue primary enrichment to fill remaining fields
  enrichmentQueue.enqueue(assetProfileId, "primary");

  return Response.json({ status: "accepted", assetProfileId }, { status: 202 });
}

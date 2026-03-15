import { z } from "zod";
import type { AIProvider } from "@/lib/ai/types";
import type { FieldSources } from "@/types";

// Zod schema for AI-extracted profile data
export const AIProfileExtractionSchema = z.object({
  name: z.string().optional(),
  isin: z.string().optional(),
  ticker: z.string().optional(),
  fundManager: z.string().optional(),
  fundCategory: z.enum(["EQUITY", "BOND", "COMBINATION"]).optional(),
  equityPct: z.number().min(0).max(100).optional(),
  bondPct: z.number().min(0).max(100).optional(),
  sectorWeightings: z.record(z.string(), z.number()).optional(),
  geographicWeightings: z.record(z.string(), z.number()).optional(),
  sector: z.string().optional(),
  country: z.string().optional(),
});

export type AIProfileExtraction = z.infer<typeof AIProfileExtractionSchema>;

/**
 * Builds the input for the AI provider based on file type.
 * - PDF: extract text with unpdf, fall back to base64 if empty
 * - Images: base64 encode
 * - Text/CSV/MD: pass through as text
 */
export async function buildExtractionInput(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ text?: string; fileBase64?: string; mimeType: string }> {
  if (mimeType === "application/pdf") {
    try {
      const { extractText } = await import("unpdf");
      const { text } = await extractText(new Uint8Array(fileBuffer), {
        mergePages: true,
      });
      if (text && text.trim().length > 0) {
        return { text, mimeType };
      }
    } catch {
      // fall back to base64
    }
    return { fileBase64: fileBuffer.toString("base64"), mimeType };
  }

  if (mimeType.startsWith("image/")) {
    return { fileBase64: fileBuffer.toString("base64"), mimeType };
  }

  // text/plain, text/csv, text/markdown — send as text
  return { text: fileBuffer.toString("utf-8"), mimeType };
}

/**
 * Run secondary enrichment for a profile using AI document extraction.
 * Merges extracted fields with ai_extraction source priority (lowest).
 */
export async function runSecondaryEnrichment(
  profileId: string,
  fileBuffer: Buffer,
  mimeType: string,
  aiProvider: AIProvider
): Promise<void> {
  // 1. Build input based on file type
  const input = await buildExtractionInput(fileBuffer, mimeType);

  // 2. Call AI provider with structured extraction prompt
  let data: Record<string, unknown>;
  try {
    const result = await aiProvider.extractStructuredData({
      ...input,
      schema: AIProfileExtractionSchema,
      prompt:
        "Extract financial instrument profile data from this document. Return structured data matching the schema with fund name, ISIN, category, sector/geographic weightings if available.",
    });
    data = result.data;
  } catch {
    // AI provider not implemented or failed — skip silently
    return;
  }

  // 3. Validate AI output
  const parsed = AIProfileExtractionSchema.safeParse(data);
  if (!parsed.success) return;

  // 4. Load existing profile
  const { prisma } = await import("@/lib/db");
  const profile = await prisma.assetProfile.findUnique({
    where: { id: profileId },
    include: { holdings: { select: { id: true, enrichmentStatus: true } } },
  });
  if (!profile) return;

  // 5. Merge fields with ai_extraction source (lowest priority)
  const { mergeProfileFields } = await import("@/lib/enrichment/types");

  let existingSources: FieldSources = {};
  try {
    existingSources = JSON.parse(profile.fieldSources) as FieldSources;
  } catch {
    existingSources = {};
  }

  const existingData = {
    name: profile.name,
    isin: profile.isin,
    ticker: profile.ticker,
    sector: profile.sector,
    country: profile.country,
    fundManager: profile.fundManager,
    fundCategory: profile.fundCategory,
    equityPct: profile.equityPct ? Number(profile.equityPct) : null,
    bondPct: profile.bondPct ? Number(profile.bondPct) : null,
    sectorWeightings: profile.sectorWeightings
      ? (JSON.parse(profile.sectorWeightings) as Record<string, number>)
      : null,
    geographicWeightings: profile.geographicWeightings
      ? (JSON.parse(profile.geographicWeightings) as Record<string, number>)
      : null,
  };

  const { fields: mergedFields, fieldSources: updatedFieldSources } =
    mergeProfileFields(existingData, parsed.data, existingSources, "ai_extraction");

  // 6. Check if any new data was extracted
  const hasNewData = Object.keys(mergedFields).length > 0;

  if (!hasNewData) return;

  // 7. Prepare update data
  const updateData: Record<string, unknown> = {
    fieldSources: JSON.stringify(updatedFieldSources),
  };

  for (const [key, value] of Object.entries(mergedFields)) {
    if (key === "sectorWeightings" || key === "geographicWeightings") {
      updateData[key] = value ? JSON.stringify(value) : null;
    } else {
      updateData[key] = value;
    }
  }

  await prisma.assetProfile.update({
    where: { id: profileId },
    data: updateData,
  });

  // 8. Update holdings that were NOT_FOUND to PARTIAL (we now have some data)
  await prisma.holding.updateMany({
    where: { assetProfileId: profileId, enrichmentStatus: "NOT_FOUND" },
    data: { enrichmentStatus: "PARTIAL" },
  });
}

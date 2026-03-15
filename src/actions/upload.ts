"use server";

import type { ActionResult } from "@/types";
import { validateUploadFile } from "@/lib/schemas/upload";

/**
 * Uploads a document for AI-powered secondary enrichment.
 * Validates the file, then fires a fire-and-forget call to /api/enrichment.
 */
export async function uploadDocument(
  profileId: string,
  formData: FormData
): Promise<ActionResult<{ profileId: string; status: "processing" }>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }

  const validation = validateUploadFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check that profile exists
  const { prisma } = await import("@/lib/db");
  const profile = await prisma.assetProfile.findUnique({
    where: { id: profileId },
  });
  if (!profile) {
    return { success: false, error: "Asset profile not found" };
  }

  // Read file and encode as base64
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  // Fire-and-forget secondary enrichment
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  void fetch(`${baseUrl}/api/enrichment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetProfileId: profileId,
      type: "secondary",
      documentBase64: base64,
      documentMimeType: file.type,
    }),
  });

  return { success: true, data: { profileId, status: "processing" } };
}

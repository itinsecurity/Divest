import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { enrichmentQueue } from "@/lib/enrichment/queue";
import { z } from "zod";

const enrichmentRequestSchema = z.object({
  assetProfileId: z.string().min(1, "assetProfileId is required"),
  type: z.enum(["primary", "secondary"]).default("primary"),
  documentBase64: z.string().optional(),
  documentMimeType: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  // 1. Check auth session
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // 2. Validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = enrichmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { assetProfileId, type, documentBase64, documentMimeType } = parsed.data;

  // Validate secondary enrichment has required fields
  if (type === "secondary") {
    if (!documentBase64 || !documentMimeType) {
      return Response.json(
        {
          error:
            "documentBase64 and documentMimeType are required for secondary enrichment",
        },
        { status: 400 }
      );
    }
  }

  // 3. Check profile exists
  const profile = await prisma.assetProfile.findUnique({
    where: { id: assetProfileId },
  });

  if (!profile) {
    return Response.json({ error: "Asset profile not found" }, { status: 404 });
  }

  // 4. Enqueue work (pass document data for secondary enrichment)
  enrichmentQueue.enqueue(
    assetProfileId,
    type,
    type === "secondary" && documentBase64 && documentMimeType
      ? { base64: documentBase64, mimeType: documentMimeType }
      : undefined
  );

  // 5. Return 202
  return Response.json({ status: "accepted", assetProfileId }, { status: 202 });
}

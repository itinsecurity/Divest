import { prisma } from "@/lib/db";
import type { AssetProfileUpdateData } from "./types";

const TTL_MS =
  parseInt(process.env.ENRICHMENT_CACHE_TTL_HOURS ?? "24", 10) * 3_600_000;

export async function getCached(
  key: string
): Promise<Partial<AssetProfileUpdateData> | null> {
  const entry = await prisma.enrichmentCache.findUnique({
    where: { cacheKey: key },
  });

  if (!entry) return null;
  if (entry.expiresAt <= new Date()) return null;

  try {
    return JSON.parse(entry.data) as Partial<AssetProfileUpdateData>;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  data: Partial<AssetProfileUpdateData>,
  source: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.enrichmentCache.upsert({
    where: { cacheKey: key },
    create: { cacheKey: key, data: JSON.stringify(data), source, expiresAt },
    update: { data: JSON.stringify(data), source, expiresAt },
  });
}

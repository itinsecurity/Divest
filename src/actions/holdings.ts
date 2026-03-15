"use server";

import { prisma } from "@/lib/db";
import type { ActionResult, HoldingWithProfile, AssetProfileData, FieldSources } from "@/types";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client";
import { createHoldingSchema, updateHoldingSchema } from "@/lib/schemas/holdings";

// --- ISIN detection ---

const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

function isISIN(identifier: string): boolean {
  return ISIN_REGEX.test(identifier);
}

// --- Helper: convert Prisma holding to HoldingWithProfile ---

function decimalToNumber(val: Decimal | null): number | null {
  if (val === null) return null;
  return val.toNumber();
}

function parseJsonField<T>(val: string | null): T | null {
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

type PrismaHoldingWithProfile = {
  id: string;
  instrumentIdentifier: string;
  instrumentType: string;
  accountName: string;
  shares: Decimal | null;
  pricePerShare: Decimal | null;
  currentValue: Decimal | null;
  enrichmentStatus: string;
  lastUpdated: Date;
  assetProfileId: string | null;
  assetProfile: {
    id: string;
    instrumentType: string;
    isin: string | null;
    ticker: string | null;
    name: string | null;
    exchange: string | null;
    country: string | null;
    sector: string | null;
    industry: string | null;
    fundManager: string | null;
    fundCategory: string | null;
    equityPct: Decimal | null;
    bondPct: Decimal | null;
    sectorWeightings: string | null;
    geographicWeightings: string | null;
    fieldSources: string;
  } | null;
};

function toHoldingWithProfile(h: PrismaHoldingWithProfile): HoldingWithProfile {
  const shares = decimalToNumber(h.shares);
  const pricePerShare = decimalToNumber(h.pricePerShare);
  const currentValue = decimalToNumber(h.currentValue);

  let displayValue = 0;
  if (h.instrumentType === "STOCK" && shares !== null && pricePerShare !== null) {
    displayValue = shares * pricePerShare;
  } else if (h.instrumentType === "FUND" && currentValue !== null) {
    displayValue = currentValue;
  }

  let assetProfile: AssetProfileData | null = null;
  if (h.assetProfile) {
    const p = h.assetProfile;
    assetProfile = {
      id: p.id,
      instrumentType: p.instrumentType as "STOCK" | "FUND",
      isin: p.isin,
      ticker: p.ticker,
      name: p.name,
      exchange: p.exchange,
      country: p.country,
      sector: p.sector,
      industry: p.industry,
      fundManager: p.fundManager,
      fundCategory: p.fundCategory as "EQUITY" | "BOND" | "COMBINATION" | null,
      equityPct: decimalToNumber(p.equityPct),
      bondPct: decimalToNumber(p.bondPct),
      sectorWeightings: parseJsonField<Record<string, number>>(p.sectorWeightings),
      geographicWeightings: parseJsonField<Record<string, number>>(p.geographicWeightings),
      fieldSources: (parseJsonField<FieldSources>(p.fieldSources) ?? {}) as FieldSources,
    };
  }

  return {
    id: h.id,
    instrumentIdentifier: h.instrumentIdentifier,
    instrumentType: h.instrumentType as "STOCK" | "FUND",
    accountName: h.accountName,
    shares,
    pricePerShare,
    currentValue,
    displayValue,
    enrichmentStatus: h.enrichmentStatus as "PENDING" | "COMPLETE" | "PARTIAL" | "NOT_FOUND",
    lastUpdated: h.lastUpdated.toISOString(),
    assetProfile,
  };
}

// --- Server Actions ---

export async function createHolding(
  input: unknown
): Promise<ActionResult<HoldingWithProfile>> {
  const parsed = createHoldingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  try {
    // Check for existing AssetProfile by ISIN or ticker match
    let assetProfileId: string | null = null;

    if (isISIN(data.instrumentIdentifier)) {
      const existing = await prisma.assetProfile.findUnique({
        where: { isin: data.instrumentIdentifier },
      });
      if (existing) {
        assetProfileId = existing.id;
      }
    }

    if (!assetProfileId) {
      // Try ticker match
      const existing = await prisma.assetProfile.findFirst({
        where: { ticker: data.instrumentIdentifier },
      });
      if (existing) {
        assetProfileId = existing.id;
      }
    }

    if (!assetProfileId) {
      // Create a new AssetProfile stub
      const profile = await prisma.assetProfile.create({
        data: {
          instrumentType: data.instrumentType,
          ...(isISIN(data.instrumentIdentifier)
            ? { isin: data.instrumentIdentifier }
            : {}),
          fieldSources: "{}",
        },
      });
      assetProfileId = profile.id;
    }

    const holding = await prisma.holding.create({
      data: {
        instrumentIdentifier: data.instrumentIdentifier,
        instrumentType: data.instrumentType,
        accountName: data.accountName,
        shares: data.shares !== undefined ? new Decimal(data.shares) : null,
        pricePerShare:
          data.pricePerShare !== undefined
            ? new Decimal(data.pricePerShare)
            : null,
        currentValue:
          data.currentValue !== undefined
            ? new Decimal(data.currentValue)
            : null,
        enrichmentStatus: "PENDING",
        assetProfileId,
        lastUpdated: new Date(),
      },
      include: { assetProfile: true },
    });

    // Fire-and-forget enrichment (do NOT await)
    const enrichmentUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/enrichment`;
    fetch(enrichmentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetProfileId, type: "primary" }),
    }).catch(() => {
      // Ignore enrichment errors — it's fire-and-forget
    });

    revalidatePath("/holdings");

    return { success: true, data: toHoldingWithProfile(holding as PrismaHoldingWithProfile) };
  } catch (err) {
    // Unique constraint violation
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return {
        success: false,
        error: `A holding for "${data.instrumentIdentifier}" in account "${data.accountName}" already exists.`,
      };
    }
    return {
      success: false,
      error: "Failed to create holding. Please try again.",
    };
  }
}

export async function updateHolding(
  id: string,
  input: unknown
): Promise<ActionResult<HoldingWithProfile>> {
  const parsed = updateHoldingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  try {
    const existing = await prisma.holding.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Holding not found." };
    }

    // Determine if lastUpdated should change
    const priceChanged =
      data.pricePerShare !== undefined ||
      data.shares !== undefined ||
      data.currentValue !== undefined;

    const updated = await prisma.holding.update({
      where: { id },
      data: {
        ...(data.accountName !== undefined
          ? { accountName: data.accountName }
          : {}),
        ...(data.shares !== undefined
          ? { shares: new Decimal(data.shares) }
          : {}),
        ...(data.pricePerShare !== undefined
          ? { pricePerShare: new Decimal(data.pricePerShare) }
          : {}),
        ...(data.currentValue !== undefined
          ? { currentValue: new Decimal(data.currentValue) }
          : {}),
        ...(priceChanged ? { lastUpdated: new Date() } : {}),
      },
      include: { assetProfile: true },
    });

    revalidatePath("/holdings");
    revalidatePath(`/holdings/${id}`);

    return { success: true, data: toHoldingWithProfile(updated as PrismaHoldingWithProfile) };
  } catch {
    return {
      success: false,
      error: "Failed to update holding. Please try again.",
    };
  }
}

export async function deleteHolding(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const existing = await prisma.holding.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Holding not found." };
    }

    await prisma.holding.delete({ where: { id } });

    revalidatePath("/holdings");

    return { success: true, data: { id } };
  } catch {
    return {
      success: false,
      error: "Failed to delete holding. Please try again.",
    };
  }
}

export async function getHoldings(
  filter?: { accountName?: string }
): Promise<ActionResult<HoldingWithProfile[]>> {
  try {
    const holdings = await prisma.holding.findMany({
      where: filter?.accountName
        ? { accountName: filter.accountName }
        : undefined,
      include: { assetProfile: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: holdings.map((h) => toHoldingWithProfile(h as PrismaHoldingWithProfile)),
    };
  } catch {
    return {
      success: false,
      error: "Failed to load holdings. Please try again.",
    };
  }
}

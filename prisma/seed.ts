import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.holding.deleteMany();
  await prisma.assetProfile.deleteMany();

  // --- Asset Profiles ---

  const dnbProfile = await prisma.assetProfile.create({
    data: {
      instrumentType: "STOCK",
      isin: "NO0010161896",
      ticker: "DNB",
      name: "DNB Bank ASA",
      exchange: "Oslo Stock Exchange",
      country: "Norway",
      sector: "Financials",
      industry: "Banks",
      fieldSources: JSON.stringify({
        name: { source: "enrichment", enrichedAt: new Date().toISOString() },
        isin: { source: "enrichment", enrichedAt: new Date().toISOString() },
        ticker: { source: "enrichment", enrichedAt: new Date().toISOString() },
        exchange: { source: "enrichment", enrichedAt: new Date().toISOString() },
        country: { source: "enrichment", enrichedAt: new Date().toISOString() },
        sector: { source: "enrichment", enrichedAt: new Date().toISOString() },
        industry: { source: "enrichment", enrichedAt: new Date().toISOString() },
      }),
    },
  });

  const storebrandProfile = await prisma.assetProfile.create({
    data: {
      instrumentType: "FUND",
      isin: "NO0010140502",
      name: "Storebrand Global Indeks A",
      fundCategory: "EQUITY",
      fundManager: "Storebrand Asset Management",
      equityPct: 95,
      bondPct: 5,
      sectorWeightings: JSON.stringify({
        Technology: 28,
        Financials: 18,
        Healthcare: 14,
        "Consumer Discretionary": 12,
        Industrials: 10,
        Other: 18,
      }),
      geographicWeightings: JSON.stringify({
        "United States": 65,
        Europe: 15,
        Japan: 7,
        "United Kingdom": 5,
        Other: 8,
      }),
      fieldSources: JSON.stringify({
        name: { source: "enrichment", enrichedAt: new Date().toISOString() },
        isin: { source: "enrichment", enrichedAt: new Date().toISOString() },
        fundCategory: { source: "enrichment", enrichedAt: new Date().toISOString() },
        fundManager: { source: "enrichment", enrichedAt: new Date().toISOString() },
        equityPct: { source: "enrichment", enrichedAt: new Date().toISOString() },
        bondPct: { source: "enrichment", enrichedAt: new Date().toISOString() },
        sectorWeightings: { source: "enrichment", enrichedAt: new Date().toISOString() },
        geographicWeightings: { source: "enrichment", enrichedAt: new Date().toISOString() },
      }),
    },
  });

  // --- Holdings ---

  // Account 1: Nordnet ASK
  await prisma.holding.create({
    data: {
      instrumentIdentifier: "NO0010161896",
      instrumentType: "STOCK",
      accountName: "Nordnet ASK",
      shares: 150,
      pricePerShare: 210.5,
      enrichmentStatus: "COMPLETE",
      assetProfileId: dnbProfile.id,
      lastUpdated: new Date(),
    },
  });

  await prisma.holding.create({
    data: {
      instrumentIdentifier: "NO0010140502",
      instrumentType: "FUND",
      accountName: "Nordnet ASK",
      currentValue: 85000,
      enrichmentStatus: "COMPLETE",
      assetProfileId: storebrandProfile.id,
      lastUpdated: new Date(),
    },
  });

  // Account 2: DNB Konto — holding with NOT_FOUND status (no profile yet)
  await prisma.holding.create({
    data: {
      instrumentIdentifier: "EQNR",
      instrumentType: "STOCK",
      accountName: "DNB Konto",
      shares: 50,
      pricePerShare: 320.0,
      enrichmentStatus: "NOT_FOUND",
      lastUpdated: new Date(),
    },
  });

  console.log("Seed complete.");
  console.log(`  DNB ASA profile: ${dnbProfile.id}`);
  console.log(`  Storebrand profile: ${storebrandProfile.id}`);
  console.log("  3 holdings created across 2 accounts");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

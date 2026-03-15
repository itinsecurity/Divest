import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encode } from "@auth/core/jwt";

export default async function globalSetup() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/divest_e2e";

  // Apply migrations to the E2E test database
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });

  // Seed the E2E test database
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.holding.deleteMany();
    await prisma.assetProfile.deleteMany();

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
          sector: { source: "enrichment", enrichedAt: new Date().toISOString() },
        }),
      },
    });

    const fundProfile = await prisma.assetProfile.create({
      data: {
        instrumentType: "FUND",
        isin: "NO0010140502",
        name: "Storebrand Global Indeks A",
        fundCategory: "EQUITY",
        fundManager: "Storebrand Asset Management",
        equityPct: 95,
        bondPct: 5,
        sectorWeightings: JSON.stringify({ Technology: 28, Financials: 18, Other: 54 }),
        geographicWeightings: JSON.stringify({ "United States": 65, Europe: 15, Other: 20 }),
        fieldSources: JSON.stringify({
          name: { source: "enrichment", enrichedAt: new Date().toISOString() },
          equityPct: { source: "enrichment", enrichedAt: new Date().toISOString() },
          sectorWeightings: { source: "enrichment", enrichedAt: new Date().toISOString() },
          geographicWeightings: { source: "enrichment", enrichedAt: new Date().toISOString() },
        }),
      },
    });

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
        assetProfileId: fundProfile.id,
        lastUpdated: new Date(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  // Generate JWT session token for E2E test authentication (bypasses GitHub OAuth)
  const secret = process.env.AUTH_SECRET ?? "e2e-test-secret-32-chars-minimum!!";
  const ownerId = process.env.AUTH_GITHUB_OWNER_ID ?? "99999999";

  const token = await encode({
    token: { sub: ownerId },
    secret,
    salt: "authjs.session-token",
  });

  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync(
    "tests/e2e/.auth/user.json",
    JSON.stringify({
      cookies: [
        {
          name: "authjs.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    })
  );
}

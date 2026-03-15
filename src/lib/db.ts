import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Create a new Prisma client reading DATABASE_URL from environment
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

declare global {
  var __prisma: PrismaClient | undefined;
}

// In test environments: always create fresh client (avoids DATABASE_URL caching issues across tests)
// In development: use global singleton to survive Next.js hot-reload
// In production: create once per process
export const prisma: PrismaClient =
  process.env.VITEST !== undefined
    ? createPrismaClient()
    : (globalThis.__prisma ??
        (globalThis.__prisma = createPrismaClient()));

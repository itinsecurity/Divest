import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Create a new Prisma client reading DATABASE_URL from environment
function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
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

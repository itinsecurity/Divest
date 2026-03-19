import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. " +
        "For local development add it to .env.local. " +
        "For other platforms set the environment variable directly. " +
        "For SST deployments link a Database resource — instrumentation.ts resolves it automatically.",
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

declare global {
  var __prisma: PrismaClient | undefined;
}

// Returns the singleton client, creating it on first call.
//
// Using a factory rather than a module-level assignment ensures the client is
// not created until after Next.js instrumentation has run (instrumentation.ts
// resolves platform-specific config such as SST resource bindings before any
// route module is evaluated).
function getClient(): PrismaClient {
  // Tests always get a fresh client to avoid DATABASE_URL being cached across
  // test files that set different values.
  if (process.env.VITEST !== undefined) {
    return createPrismaClient();
  }
  return (globalThis.__prisma ??= createPrismaClient());
}

// Proxy so callers can write `prisma.holding.findMany()` etc. without needing
// to call a getter explicitly.  The underlying client is initialised on the
// first property access, guaranteeing instrumentation has already run.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

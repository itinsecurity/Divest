import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Lazy factory to ensure DATABASE_URL is read after setup.ts sets it
function createTestPrisma(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/divest_test",
  });
  return new PrismaClient({ adapter, log: ["error"] });
}

// Lazily initialized test prisma client
let _testPrisma: PrismaClient | undefined;

function getTestPrisma(): PrismaClient {
  if (!_testPrisma) {
    _testPrisma = createTestPrisma();
  }
  return _testPrisma;
}

export const testPrisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getTestPrisma();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export async function resetDatabase() {
  const client = getTestPrisma();
  // Delete in dependency order
  await client.holding.deleteMany();
  await client.assetProfile.deleteMany();
}

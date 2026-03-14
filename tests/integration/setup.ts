import { execSync } from "child_process";
import { vi } from "vitest";

// Set environment variables before any module imports
// (vitest env config may not apply early enough for Prisma singleton initialization)
process.env.DATABASE_URL = "file:./test-integration.db";
process.env.AUTH_USERNAME = "testuser";
process.env.AUTH_PASSWORD_HASH = "$2b$10$test";
process.env.AUTH_SECRET = "test-secret";
process.env.AI_PROVIDER = "stub";

// Mock next/cache since it's not available outside Next.js
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeAll(async () => {
  // Push schema to test database (creates it if it doesn't exist, applies schema changes)
  // Using --accept-data-loss for SQLite dev database only — not production
  execSync("npx prisma db push --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: "file:./test-integration.db" },
    stdio: "pipe",
  });
});

import { execSync } from "child_process";
import { vi } from "vitest";

// Set environment variables before any module imports
// (vitest env config may not apply early enough for Prisma singleton initialization)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/divest_test";
}
process.env.AUTH_USERNAME = "testuser";
process.env.AUTH_PASSWORD_HASH = "$2b$10$test";
process.env.AUTH_SECRET = "test-secret";
process.env.AI_PROVIDER = "stub";

// Mock next/cache since it's not available outside Next.js
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env },
    stdio: "pipe",
  });
});

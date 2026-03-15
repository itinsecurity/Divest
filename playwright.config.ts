import { defineConfig, devices } from "@playwright/test";

// Pre-generated bcrypt hash for "testpassword" (cost factor 10), base64-encoded
const TEST_PASSWORD_HASH_B64 =
  "JDJhJDEwJFlFRUUzTjg3VnUvM0RIazllRktHTy5wSkFrQlRqMGVvODF0SEJpcW1ILk1VUGQ4THJ0cXZH";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // Allow overriding with a pre-installed browser when downloading is unavailable
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : {}),
        },
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/divest_e2e",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-test-secret-32-chars-minimum!!",
      AUTH_USERNAME: process.env.AUTH_USERNAME ?? "testuser",
      AUTH_PASSWORD_HASH_B64:
        process.env.AUTH_PASSWORD_HASH_B64 ?? TEST_PASSWORD_HASH_B64,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
      AI_PROVIDER: process.env.AI_PROVIDER ?? "stub",
    },
  },
});

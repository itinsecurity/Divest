import { defineConfig, devices } from "@playwright/test";

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
    storageState: "tests/e2e/.auth/user.json",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
        launchOptions: {
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : {}),
        },
      },
      dependencies: ["setup"],
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
      AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "test-github-id",
      AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ?? "test-github-secret",
      AUTH_GITHUB_OWNER_ID: process.env.AUTH_GITHUB_OWNER_ID ?? "99999999",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
      AI_PROVIDER: process.env.AI_PROVIDER ?? "stub",
    },
  },
});

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["tests/integration/setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL: "file:./test-integration.db",
      AUTH_USERNAME: "testuser",
      AUTH_PASSWORD_HASH: "$2b$10$test",
      AUTH_SECRET: "test-secret",
      AI_PROVIDER: "stub",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

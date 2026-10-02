import "dotenv/config";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const seedPassword = process.env.E2E_USER_PASSWORD ?? process.env.SEED_USER_PASSWORD;
if (!seedPassword) throw new Error("Set E2E_USER_PASSWORD or SEED_USER_PASSWORD before running Playwright.");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${new URL(baseURL).port || "3000"}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://creditflow:creditflow@localhost:5432/creditflow?schema=public",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "local-e2e-secret-only-not-for-deployment",
      AUTH_TRUST_HOST: "true",
      SEED_USER_PASSWORD: seedPassword,
      DOCUMENT_AI_URL: "",
    },
  },
});

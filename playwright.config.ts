import { defineConfig, devices } from "@playwright/test";

const previewEnv = {
  APP_ENV: "development",
  NODE_ENV: "test",
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "test_api_key",
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET || "test_api_secret",
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "http://127.0.0.1:3000",
  DEV_DATABASE_URL: process.env.DEV_DATABASE_URL || "file:./dev.sqlite",
  SCOPES: process.env.SCOPES || "read_products",
};

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.(e2e|spec)\.ts/,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer:
    process.env.PLAYWRIGHT_START_SERVER === "true"
      ? {
          command: "npm run dev:preview",
          env: previewEnv,
          url: "http://127.0.0.1:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        }
      : undefined,
  projects: [
    {
      name: "chromium",
      testMatch: /tests\/e2e\/.*\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /tests\/e2e\/.*\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "accessibility",
      testMatch: /tests\/accessibility\/.*\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

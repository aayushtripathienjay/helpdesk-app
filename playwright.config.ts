import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command:
        "bash -lc 'set -a; . ./.env.test; set +a; cd apps/api && bun src/scripts/reset-test-db.ts && bun src/scripts/seed-e2e-users.ts && bun src/index.ts'",
      timeout: 120_000,
      url: "http://127.0.0.1:3100/api/health",
      reuseExistingServer: false
    },
    {
      command:
        "bash -lc 'set -a; . ./.env.test; set +a; cd apps/web && API_PROXY_TARGET=http://127.0.0.1:3100 /home/enjay/.nvm/versions/node/v22.23.1/bin/node ../../node_modules/.bun/vite@6.4.3+5e3c66d3095ae211/node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort'",
      timeout: 120_000,
      url: "http://127.0.0.1:4173/login",
      reuseExistingServer: false
    }
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome"
      }
    }
  ]
});

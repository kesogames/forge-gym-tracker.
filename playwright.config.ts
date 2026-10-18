import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const localChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    launchOptions: existsSync(localChromium) ? { executablePath: localChromium } : {},
  },
  projects: [
    { name: "mobiel", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } }, testMatch: /layout\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

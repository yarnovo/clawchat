import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8080",
    browserName: "chromium",
    headless: process.env.CI === "true",
    screenshot: "only-on-failure",
  },
});

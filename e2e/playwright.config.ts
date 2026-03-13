import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: "http://localhost:8080",
    browserName: "chromium",
    headless: false,
    screenshot: "only-on-failure",
  },
});

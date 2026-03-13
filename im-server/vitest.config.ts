import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://clawchat:clawchat@localhost:5432/clawchat",
      JWT_SECRET: "test-secret",
    },
  },
});

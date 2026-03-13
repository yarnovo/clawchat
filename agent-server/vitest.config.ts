import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL:
        "postgresql://clawchat:clawchat@localhost:5432/clawchat_agent",
      IM_SERVER_URL: "http://localhost:3000",
    },
  },
});

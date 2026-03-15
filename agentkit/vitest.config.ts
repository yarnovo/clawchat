import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['core', 'event-loop', 'agentic', 'provider-llm-openai', 'provider-session-sqlite', 'extension-skills', 'extension-memory', 'channel-http', 'channel-scheduler', 'eval'],
    coverage: {
      provider: 'v8',
      include: ['*/src/**/*.ts'],
      exclude: ['*/src/__tests__/**', '*/dist/**', '*/examples/**'],
    },
  },
});

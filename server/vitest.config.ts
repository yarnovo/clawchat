import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgres://localhost:5432/test_unused',
    },
  },
});

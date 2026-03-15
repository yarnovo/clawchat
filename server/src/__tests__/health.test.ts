import { describe, it, expect, vi } from 'vitest';

// Prevent real HTTP server from starting
vi.mock('@hono/node-server', () => ({ serve: vi.fn() }));

// Mock DB so postgres connection isn't attempted
vi.mock('../db/index.js', () => ({
  db: {
    select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }),
    insert: () => ({ values: () => ({ returning: vi.fn().mockResolvedValue([]) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: vi.fn().mockResolvedValue([]) }) }) }),
  },
}));

import app from '../app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});

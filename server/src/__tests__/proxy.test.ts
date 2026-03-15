import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mocks (must be before app import) ----------

vi.mock('@hono/node-server', () => ({
  serve: vi.fn(),
}));

const mockSelect = vi.fn();

vi.mock('../db/index.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockSelect,
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

// Mock global fetch for upstream agent requests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import app from '../app.js';
import { authHeader } from './helpers.js';

// ---------- Fixtures ----------

const AGENT_ID = '11111111-2222-3333-4444-555555555555';
const OWNER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CHANNEL_URL = 'http://agent-container:8080';

function fakeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    ownerId: OWNER_ID,
    name: 'TestBot',
    description: '',
    imageTag: null,
    status: 'running',
    channelUrl: CHANNEL_URL,
    containerName: 'agent-test',
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

// ---------- Tests ----------

describe('Proxy routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- GET /api/proxy/:agentId/info ---

  describe('GET /api/proxy/:agentId/info', () => {
    it('forwards info request to agent channelUrl', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent()]);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ name: 'TestBot', version: '1.0' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const headers = await authHeader();
      const res = await app.request(`/api/proxy/${AGENT_ID}/info`, { headers });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.name).toBe('TestBot');

      expect(mockFetch).toHaveBeenCalledWith(`${CHANNEL_URL}/api/info`);
    });

    it('returns 404 when agent not found', async () => {
      mockSelect.mockResolvedValueOnce([]);

      const headers = await authHeader();
      const res = await app.request(`/api/proxy/${AGENT_ID}/info`, { headers });
      expect(res.status).toBe(404);
    });

    it('returns 400 when agent is not running', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'stopped' })]);

      const headers = await authHeader();
      const res = await app.request(`/api/proxy/${AGENT_ID}/info`, { headers });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Agent is not running');
    });
  });

  // --- POST /api/proxy/:agentId/chat ---

  describe('POST /api/proxy/:agentId/chat', () => {
    it('forwards chat request body to agent', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent()]);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ reply: 'Hello!' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const headers = await authHeader();
      const res = await app.request(`/api/proxy/${AGENT_ID}/chat`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hi' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.reply).toBe('Hello!');

      // Verify fetch was called with correct URL and body
      expect(mockFetch).toHaveBeenCalledWith(`${CHANNEL_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hi' }),
      });
    });

    it('returns 400 when agent is not running', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'created' })]);

      const headers = await authHeader();
      const res = await app.request(`/api/proxy/${AGENT_ID}/chat`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hi' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when agent has no channelUrl', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'running', channelUrl: null })]);

      const headers = await authHeader();
      const res = await app.request(`/api/proxy/${AGENT_ID}/chat`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hi' }),
      });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Agent has no channel URL');
    });

    it('relays upstream error status', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent()]);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'internal error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const headers = await authHeader();
      const res = await app.request(`/api/proxy/${AGENT_ID}/chat`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hi' }),
      });
      expect(res.status).toBe(500);
    });
  });
});

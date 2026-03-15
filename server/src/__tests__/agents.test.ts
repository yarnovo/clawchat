import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mocks (must be before app import) ----------

// Prevent real HTTP server from starting
vi.mock('@hono/node-server', () => ({
  serve: vi.fn(),
}));

// Mock the database layer
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../db/index.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockSelect,
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: mockInsert,
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: mockUpdate,
        }),
      }),
    }),
  },
}));

// Mock agent lifecycle service
const mockStartAgent = vi.fn();
const mockStopAgent = vi.fn();

vi.mock('../services/agent-lifecycle.js', () => ({
  startAgent: (...args: unknown[]) => mockStartAgent(...args),
  stopAgent: (...args: unknown[]) => mockStopAgent(...args),
}));

import app from '../app.js';
import { authHeader } from './helpers.js';

// ---------- Fixtures ----------

const AGENT_ID = '11111111-2222-3333-4444-555555555555';
const OWNER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CHANNEL_URL = 'http://agentkit-test:3000';

function fakeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    ownerId: OWNER_ID,
    name: 'TestBot',
    description: '',
    imageTag: null,
    status: 'created',
    channelUrl: null,
    containerName: null,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

// ---------- Tests ----------

describe('Agents routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- GET /api/agents ---

  describe('GET /api/agents', () => {
    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/agents');
      expect(res.status).toBe(401);
    });

    it('returns list of user agents', async () => {
      const agents = [fakeAgent(), fakeAgent({ id: '22222222-3333-4444-5555-666666666666', name: 'Bot2' })];
      mockSelect.mockResolvedValueOnce(agents);

      const headers = await authHeader();
      const res = await app.request('/api/agents', { headers });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toHaveLength(2);
      expect(body.agents[0].name).toBe('TestBot');
    });

    it('returns empty list when user has no agents', async () => {
      mockSelect.mockResolvedValueOnce([]);

      const headers = await authHeader();
      const res = await app.request('/api/agents', { headers });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toEqual([]);
    });
  });

  // --- POST /api/agents ---

  describe('POST /api/agents', () => {
    it('returns 400 when name is missing', async () => {
      const headers = await authHeader();
      const res = await app.request('/api/agents', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'no name' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('returns 400 when name is empty string', async () => {
      const headers = await authHeader();
      const res = await app.request('/api/agents', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      expect(res.status).toBe(400);
    });

    it('creates agent and returns 201', async () => {
      const created = fakeAgent({ name: 'NewBot' });
      mockInsert.mockResolvedValueOnce([created]);

      const headers = await authHeader();
      const res = await app.request('/api/agents', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'NewBot', description: 'A test bot' }),
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.agent.name).toBe('NewBot');
    });
  });

  // --- GET /api/agents/:id ---

  describe('GET /api/agents/:id', () => {
    it('returns agent by id', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent()]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}`, { headers });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agent.id).toBe(AGENT_ID);
    });

    it('returns 404 for non-existent agent', async () => {
      mockSelect.mockResolvedValueOnce([]);

      const headers = await authHeader();
      const res = await app.request('/api/agents/00000000-0000-0000-0000-000000000000', { headers });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Agent not found');
    });
  });

  // --- DELETE /api/agents/:id ---

  describe('DELETE /api/agents/:id', () => {
    it('soft deletes an agent', async () => {
      const deleted = fakeAgent({ status: 'deleted', deletedAt: new Date() });
      mockUpdate.mockResolvedValueOnce([deleted]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}`, {
        method: 'DELETE',
        headers,
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.deleted).toBe(true);
      expect(body.agent.status).toBe('deleted');
    });

    it('returns 404 when agent does not exist', async () => {
      mockUpdate.mockResolvedValueOnce([]);

      const headers = await authHeader();
      const res = await app.request('/api/agents/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
        headers,
      });
      expect(res.status).toBe(404);
    });
  });

  // --- POST /api/agents/:id/start ---

  describe('POST /api/agents/:id/start', () => {
    it('starts a created agent', async () => {
      // First select: route checks agent exists and status
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'created' })]);
      // startAgent resolves with channelUrl
      mockStartAgent.mockResolvedValueOnce({ channelUrl: CHANNEL_URL });
      // Second select: route re-fetches the updated agent
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'running', channelUrl: CHANNEL_URL })]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/start`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agent.status).toBe('running');
      expect(body.channelUrl).toBe(CHANNEL_URL);
      expect(mockStartAgent).toHaveBeenCalledWith(AGENT_ID);
    });

    it('returns 400 if agent is already running', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'running' })]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/start`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Agent is already running');
    });

    it('returns 404 if agent not found', async () => {
      mockSelect.mockResolvedValueOnce([]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/start`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(404);
    });

    it('returns 500 if startAgent throws', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'stopped' })]);
      mockStartAgent.mockRejectedValueOnce(new Error('Container failed'));

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/start`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error).toContain('Container failed');
    });
  });

  // --- POST /api/agents/:id/stop ---

  describe('POST /api/agents/:id/stop', () => {
    it('stops a running agent', async () => {
      // First select: route checks agent is running
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'running' })]);
      // stopAgent resolves
      mockStopAgent.mockResolvedValueOnce(undefined);
      // Second select: route re-fetches the updated agent
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'stopped' })]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/stop`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agent.status).toBe('stopped');
      expect(mockStopAgent).toHaveBeenCalledWith(AGENT_ID);
    });

    it('returns 400 if agent is not running', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'stopped' })]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/stop`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('Agent is not running');
    });

    it('returns 404 if agent not found', async () => {
      mockSelect.mockResolvedValueOnce([]);

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/stop`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(404);
    });

    it('returns 500 if stopAgent throws', async () => {
      mockSelect.mockResolvedValueOnce([fakeAgent({ status: 'running' })]);
      mockStopAgent.mockRejectedValueOnce(new Error('Docker timeout'));

      const headers = await authHeader();
      const res = await app.request(`/api/agents/${AGENT_ID}/stop`, {
        method: 'POST',
        headers,
      });
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error).toContain('Docker timeout');
    });
  });
});

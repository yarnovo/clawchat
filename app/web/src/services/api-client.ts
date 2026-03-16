import type { Agent } from '@/types'

const BASE_URL = '/api'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body || res.statusText)
  }

  return res.json() as Promise<T>
}

// ---------- Agent CRUD ----------

export async function listAgents(): Promise<{ agents: Agent[] }> {
  return request('/agents')
}

export async function getAgent(agentId: string): Promise<{ agent: Agent }> {
  return request(`/agents/${agentId}`)
}

export async function createAgent(body: {
  name: string
  description?: string
  persona?: string
  resourceProfile?: string
}): Promise<{ agent: Agent }> {
  return request('/agents', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteAgent(agentId: string): Promise<void> {
  return request(`/agents/${agentId}`, { method: 'DELETE' })
}

// ---------- Agent Lifecycle ----------

export async function startAgent(agentId: string): Promise<{ agent: Agent }> {
  return request(`/agents/${agentId}/start`, { method: 'POST' })
}

export async function stopAgent(agentId: string): Promise<{ agent: Agent }> {
  return request(`/agents/${agentId}/stop`, { method: 'POST' })
}

// ---------- Messages (proxy to container) ----------

export async function sendMessage(
  agentId: string,
  text: string,
): Promise<Record<string, unknown>> {
  return request(`/agents/${agentId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

// ---------- Sessions ----------

export async function newSession(
  agentId: string,
): Promise<{ sessionId: number }> {
  return request(`/agents/${agentId}/sessions/new`, { method: 'POST' })
}

export { ApiError }

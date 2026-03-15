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

export async function chatSend(
  agentId: string,
  text: string,
): Promise<{ requestId: string }> {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ agentId, text }),
  })
}

export async function getAgentInfo(agentId: string): Promise<Agent> {
  return request(`/agents/${agentId}`)
}

export async function listAgents(): Promise<Agent[]> {
  return request('/agents')
}

export { ApiError }

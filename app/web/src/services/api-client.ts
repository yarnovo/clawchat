import type { Agent, Message, Skill, SkillDetail, CredentialKey } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

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

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // httpOnly cookie auto-sent
  })

  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body || res.statusText)
  }

  return res.json() as Promise<T>
}

// ---------- Auth ----------

export async function apiLogin(
  username: string,
  password: string,
): Promise<{ user: { id: string; name: string } }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function apiRegister(
  username: string,
  password: string,
  avatar?: string,
): Promise<{ user: { id: string; name: string } }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, avatar }),
  })
}

export async function apiLogout(): Promise<void> {
  return request('/auth/logout', { method: 'POST' })
}

export async function getMe(): Promise<{
  user: { id: string; name: string; type: string; defaultAgentId: string | null }
}> {
  return request('/auth/me')
}

// ---------- Conversations (chat list) ----------

export async function listConversations(): Promise<{ agents: Agent[] }> {
  return listAgents()
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
  avatar?: string
  category?: string
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

// ---------- Messages ----------

export async function sendMessage(
  agentId: string,
  text: string,
  requestId?: string,
): Promise<{ ok: boolean; requestId: string }> {
  return request(`/agents/${agentId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text, requestId }),
  })
}

export async function abortAgent(
  agentId: string,
): Promise<{ ok: boolean }> {
  return request(`/agents/${agentId}/abort`, { method: 'POST' })
}

// ---------- Sessions ----------

export async function newSession(
  agentId: string,
): Promise<{ sessionId: number }> {
  return request(`/agents/${agentId}/sessions/new`, { method: 'POST' })
}

// ---------- Chat History ----------

export interface ChatSessionSummary {
  sessionId: number
  title: string
  tag: string | null
  messageCount: number
  lastMessage: string
  lastTimestamp: number
}

export async function getChatSessions(
  agentId: string,
): Promise<{ sessions: ChatSessionSummary[] }> {
  return request(`/agents/${agentId}/history`)
}

export async function getSessionMessages(
  agentId: string,
  sessionId: number,
): Promise<{ messages: Message[] }> {
  return request(`/agents/${agentId}/history/${sessionId}`)
}

// ---------- Skills ----------

export async function listSkills(): Promise<{ skills: Skill[] }> {
  return request('/skills')
}

export async function getSkill(name: string): Promise<{ skill: SkillDetail }> {
  return request(`/skills/${name}`)
}

export async function installSkill(
  skillName: string,
  agentId: string,
): Promise<{ installed: boolean }> {
  return request(`/skills/${skillName}/install`, {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  })
}

export async function uninstallSkill(
  skillName: string,
  agentId: string,
): Promise<{ uninstalled: boolean }> {
  return request(`/skills/${skillName}/uninstall`, {
    method: 'DELETE',
    body: JSON.stringify({ agentId }),
  })
}

// ---------- Agent Skills ----------

export interface InstalledSkill {
  name: string
  displayName: string
  description: string
  version: string
  installedAt: string
}

export async function getAgentSkills(
  agentId: string,
): Promise<{ skills: InstalledSkill[] }> {
  return request(`/agents/${agentId}/skills`)
}

// ---------- Credentials ----------

export async function getCredentials(
  agentId: string,
): Promise<{ credentials: CredentialKey[] }> {
  return request(`/agents/${agentId}/credentials`)
}

export async function setCredentials(
  agentId: string,
  credentials: Record<string, string>,
  notes?: Record<string, string>,
): Promise<{ updated: boolean }> {
  return request(`/agents/${agentId}/credentials`, {
    method: 'PUT',
    body: JSON.stringify({ credentials, notes }),
  })
}

export { ApiError }

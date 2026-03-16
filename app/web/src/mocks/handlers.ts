import { http, HttpResponse, delay } from 'msw'
import { MOCK_AGENTS, MOCK_MESSAGES, MOCK_RESPONSES } from '@/data/mock-data'
import type { Agent, Message } from '@/types'

// In-memory state (survives across requests within a session)
let agents: Agent[] = [...MOCK_AGENTS]
const messagesMap: Record<string, Message[]> = { ...MOCK_MESSAGES }
let nextSessionId = 2

export const handlers = [
  // ── Agent CRUD ──

  http.get('/api/agents', async () => {
    await delay(200)
    // Attach lastMessage to each agent
    const agentsWithLast = agents.map((agent) => {
      const msgs = messagesMap[agent.id]
      const last = msgs?.at(-1)
      return {
        ...agent,
        lastMessage: last
          ? { content: last.content, timestamp: last.timestamp }
          : undefined,
      }
    })
    return HttpResponse.json({ agents: agentsWithLast })
  }),

  http.get('/api/agents/:agentId', async ({ params }) => {
    await delay(150)
    let agent = agents.find((a) => a.id === params.agentId)
    // Auto-create self agent if requested
    if (!agent && params.agentId === 'self') {
      agent = {
        id: 'self',
        name: '自己',
        description: '给自己发消息',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=self',
        status: 'running' as const,
        currentSessionId: 1,
        resourceProfile: 'standard',
        skills: [],
        createdAt: new Date().toISOString(),
      }
      agents = [...agents, agent]
    }
    if (!agent) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json({ agent })
  }),

  http.post('/api/agents', async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as {
      name: string
      description?: string
      resourceProfile?: string
    }
    const agent: Agent = {
      id: `agent-${Date.now()}`,
      name: body.name,
      description: body.description ?? '',
      avatar: `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(body.name)}`,
      status: 'running',
      currentSessionId: 1,
      resourceProfile: body.resourceProfile ?? 'standard',
      skills: [],
      createdAt: new Date().toISOString(),
    }
    agents = [...agents, agent]
    return HttpResponse.json({ agent }, { status: 201 })
  }),

  http.delete('/api/agents/:agentId', async ({ params }) => {
    await delay(200)
    agents = agents.filter((a) => a.id !== params.agentId)
    return HttpResponse.json({ ok: true })
  }),

  // ── Agent Lifecycle ──

  http.post('/api/agents/:agentId/start', async ({ params }) => {
    await delay(500)
    agents = agents.map((a) =>
      a.id === params.agentId ? { ...a, status: 'running' as const } : a,
    )
    const agent = agents.find((a) => a.id === params.agentId)
    return HttpResponse.json({ agent })
  }),

  http.post('/api/agents/:agentId/stop', async ({ params }) => {
    await delay(300)
    agents = agents.map((a) =>
      a.id === params.agentId ? { ...a, status: 'stopped' as const } : a,
    )
    const agent = agents.find((a) => a.id === params.agentId)
    return HttpResponse.json({ agent })
  }),

  // ── Messages ──

  http.post('/api/agents/:agentId/messages', async ({ params, request }) => {
    const { agentId } = params as { agentId: string }
    const body = (await request.json()) as { text: string }

    // Store user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      agentId,
      sessionId: 1,
      role: 'user',
      content: body.text,
      status: 'sent',
      timestamp: Date.now(),
    }
    if (!messagesMap[agentId]) messagesMap[agentId] = []
    messagesMap[agentId].push(userMsg)

    // Simulate thinking delay
    await delay(800 + Math.random() * 1200)

    // Generate mock reply
    const reply =
      MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      agentId,
      sessionId: 1,
      role: 'assistant',
      content: reply,
      status: 'complete',
      timestamp: Date.now(),
    }
    messagesMap[agentId].push(assistantMsg)

    return HttpResponse.json({ reply, messageId: assistantMsg.id })
  }),

  // ── Sessions ──

  http.post('/api/agents/:agentId/sessions/new', async () => {
    await delay(200)
    const sessionId = nextSessionId++
    return HttpResponse.json({ sessionId })
  }),

  // ── Messages history (bonus: fetch messages for an agent) ──

  http.get('/api/agents/:agentId/messages', async ({ params }) => {
    await delay(150)
    const { agentId } = params as { agentId: string }
    return HttpResponse.json({ messages: messagesMap[agentId] ?? [] })
  }),
]

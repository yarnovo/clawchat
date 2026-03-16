import { create } from 'zustand'
import type { Agent, Message } from '@/types'
import { MOCK_AGENTS, MOCK_MESSAGES } from '@/data/mock-data'

interface AgentState {
  agents: Agent[]
  activeAgentId: string | null
  messages: Message[]
  messagesMap: Record<string, Message[]>
  currentSessionId: number
  isTyping: boolean

  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  setActiveAgent: (id: string | null) => void
  updateAgent: (id: string, patch: Partial<Agent>) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, patch: Partial<Message>) => void
  setTyping: (typing: boolean) => void
  clearMessages: () => void
  setCurrentSessionId: (id: number) => void
}

export const useAgentStore = create<AgentState>()((set, get) => ({
  agents: MOCK_AGENTS,
  activeAgentId: null,
  messages: [],
  messagesMap: { ...MOCK_MESSAGES },
  currentSessionId: 1,
  isTyping: false,

  setAgents: (agents) => set({ agents }),

  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),

  setActiveAgent: (id) => {
    const messagesMap = get().messagesMap
    set({
      activeAgentId: id,
      messages: id ? (messagesMap[id] ?? []) : [],
      isTyping: false,
    })
  },

  updateAgent: (id, patch) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  addMessage: (message) =>
    set((state) => {
      const newMessages = [...state.messages, message]
      return {
        messages: newMessages,
        messagesMap: {
          ...state.messagesMap,
          [message.agentId]: newMessages,
        },
      }
    }),

  updateMessage: (messageId, patch) =>
    set((state) => {
      const newMessages = state.messages.map((m) =>
        m.id === messageId ? { ...m, ...patch } : m,
      )
      const agentId = state.activeAgentId
      return {
        messages: newMessages,
        ...(agentId
          ? { messagesMap: { ...state.messagesMap, [agentId]: newMessages } }
          : {}),
      }
    }),

  setTyping: (typing) => set({ isTyping: typing }),

  clearMessages: () => set({ messages: [] }),

  setCurrentSessionId: (id) => set({ currentSessionId: id }),
}))

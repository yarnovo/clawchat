import { create } from 'zustand'
import type { Agent, Message } from '@/types'

interface AgentState {
  agents: Agent[]
  activeAgentId: string | null
  messages: Message[]
  currentSessionId: number
  isTyping: boolean

  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  setActiveAgent: (id: string | null) => void
  updateAgent: (id: string, patch: Partial<Agent>) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, patch: Partial<Message>) => void
  setTyping: (typing: boolean) => void
  clearMessages: () => void
  setCurrentSessionId: (id: number) => void
}

export const useAgentStore = create<AgentState>()((set) => ({
  agents: [],
  activeAgentId: null,
  messages: [],
  currentSessionId: 1,
  isTyping: false,

  setAgents: (agents) => set({ agents }),

  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),

  setActiveAgent: (id) =>
    set({ activeAgentId: id, messages: [], isTyping: false }),

  updateAgent: (id, patch) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (messageId, patch) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...patch } : m,
      ),
    })),

  setTyping: (typing) => set({ isTyping: typing }),

  clearMessages: () => set({ messages: [] }),

  setCurrentSessionId: (id) => set({ currentSessionId: id }),
}))

import { create } from 'zustand'
import type { Conversation, Message } from '@/types'

interface ChatState {
  conversations: Conversation[]
  messagesByConversation: Record<string, Message[]>
  activeConversationId: string | null
  isTyping: boolean

  selectConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, patch: Partial<Message>) => void
  setTyping: (typing: boolean) => void
  createConversation: (conversation: Conversation) => void
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  isTyping: false,

  selectConversation: (id) =>
    set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? []
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...existing, message],
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: message.content, lastMessageAt: message.timestamp }
            : c
        ),
      }
    }),

  updateMessage: (conversationId, messageId, patch) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId]
      if (!existing) return state
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) =>
            m.id === messageId ? { ...m, ...patch } : m
          ),
        },
      }
    }),

  setTyping: (typing) =>
    set({ isTyping: typing }),

  createConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
    })),
}))

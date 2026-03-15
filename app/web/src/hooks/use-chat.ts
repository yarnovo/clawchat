import { useCallback } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { chatSend } from '@/services/api-client'

export function useChat(conversationId: string | null) {
  const messages = useChatStore((s) =>
    conversationId ? (s.messagesByConversation[conversationId] ?? []) : []
  )
  const isTyping = useChatStore((s) => s.isTyping)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateMessage = useChatStore((s) => s.updateMessage)

  const send = useCallback(
    async (text: string, agentId: string) => {
      if (!conversationId) return

      const messageId = crypto.randomUUID()
      const userMessage = {
        id: messageId,
        conversationId,
        role: 'user' as const,
        content: text,
        status: 'sending' as const,
        timestamp: Date.now(),
      }

      // Optimistic: add user message immediately
      addMessage(conversationId, userMessage)

      try {
        const { requestId } = await chatSend(agentId, text)
        updateMessage(conversationId, messageId, {
          status: 'sent',
          requestId,
        })
      } catch {
        updateMessage(conversationId, messageId, {
          status: 'error',
        })
      }
    },
    [conversationId, addMessage, updateMessage],
  )

  return { messages, isTyping, send }
}

import { useCallback } from 'react'
import { useAgentStore } from '@/stores/agent-store'
import { MOCK_RESPONSES } from '@/data/mock-data'
import type { Message } from '@/types'

export function useAgentChat(agentId: string | null) {
  const messages = useAgentStore((s) => s.messages)
  const isTyping = useAgentStore((s) => s.isTyping)
  const currentSessionId = useAgentStore((s) => s.currentSessionId)
  const addMessage = useAgentStore((s) => s.addMessage)
  const setTyping = useAgentStore((s) => s.setTyping)
  const clearMessages = useAgentStore((s) => s.clearMessages)
  const setCurrentSessionId = useAgentStore((s) => s.setCurrentSessionId)

  const send = useCallback(
    async (text: string) => {
      if (!agentId) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        agentId,
        sessionId: currentSessionId,
        role: 'user',
        content: text,
        status: 'sent',
        timestamp: Date.now(),
      }

      addMessage(userMessage)
      setTyping(true)

      // Simulate response delay
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200))

      const reply =
        MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        agentId,
        sessionId: currentSessionId,
        role: 'assistant',
        content: reply,
        status: 'complete',
        timestamp: Date.now(),
      }

      addMessage(assistantMessage)
      setTyping(false)
    },
    [agentId, currentSessionId, addMessage, setTyping],
  )

  const startNewSession = useCallback(() => {
    clearMessages()
    setCurrentSessionId(currentSessionId + 1)
  }, [currentSessionId, clearMessages, setCurrentSessionId])

  return { messages, isTyping, currentSessionId, send, startNewSession }
}

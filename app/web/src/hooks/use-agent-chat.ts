import { useCallback } from 'react'
import { useAgentStore } from '@/stores/agent-store'
import { sendMessage, newSession } from '@/services/api-client'
import type { Message } from '@/types'

export function useAgentChat(agentId: string | null) {
  const messages = useAgentStore((s) => s.messages)
  const isTyping = useAgentStore((s) => s.isTyping)
  const currentSessionId = useAgentStore((s) => s.currentSessionId)
  const addMessage = useAgentStore((s) => s.addMessage)
  const updateMessage = useAgentStore((s) => s.updateMessage)
  const setTyping = useAgentStore((s) => s.setTyping)
  const setCurrentSessionId = useAgentStore((s) => s.setCurrentSessionId)
  const clearMessages = useAgentStore((s) => s.clearMessages)

  const send = useCallback(
    async (text: string) => {
      if (!agentId) return

      const messageId = crypto.randomUUID()
      const userMessage: Message = {
        id: messageId,
        agentId,
        sessionId: currentSessionId,
        role: 'user',
        content: text,
        status: 'sending',
        timestamp: Date.now(),
      }

      addMessage(userMessage)
      setTyping(true)

      try {
        const data = await sendMessage(agentId, text)
        updateMessage(messageId, { status: 'sent' })

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          agentId,
          sessionId: currentSessionId,
          role: 'assistant',
          content:
            (data as Record<string, string>).reply ??
            (data as Record<string, string>).error ??
            'No response',
          status: 'complete',
          timestamp: Date.now(),
        }
        addMessage(assistantMessage)
      } catch {
        updateMessage(messageId, { status: 'error' })
      } finally {
        setTyping(false)
      }
    },
    [agentId, currentSessionId, addMessage, updateMessage, setTyping],
  )

  const startNewSession = useCallback(async () => {
    if (!agentId) return
    try {
      const { sessionId } = await newSession(agentId)
      clearMessages()
      setCurrentSessionId(sessionId)
    } catch {
      // ignore
    }
  }, [agentId, clearMessages, setCurrentSessionId])

  return { messages, isTyping, currentSessionId, send, startNewSession }
}

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
  const updateAgent = useAgentStore((s) => s.updateAgent)
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
        status: 'sent',
        timestamp: Date.now(),
      }

      addMessage(userMessage)
      updateAgent(agentId, {
        lastMessage: { content: text, timestamp: userMessage.timestamp },
      })
      setTyping(true)

      try {
        const data = await sendMessage(agentId, text)

        const replyContent =
          (data as Record<string, string>).reply ??
          (data as Record<string, string>).error ??
          'No response'
        const replyTimestamp = Date.now()

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          agentId,
          sessionId: currentSessionId,
          role: 'assistant',
          content: replyContent,
          status: 'complete',
          timestamp: replyTimestamp,
        }
        addMessage(assistantMessage)
        updateAgent(agentId, {
          lastMessage: { content: replyContent, timestamp: replyTimestamp },
        })
      } catch {
        updateMessage(messageId, { status: 'error' })
      } finally {
        setTyping(false)
      }
    },
    [agentId, currentSessionId, addMessage, updateMessage, updateAgent, setTyping],
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

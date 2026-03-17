import { useCallback } from 'react'
import { useAgentStore } from '@/stores/agent-store'
import { sendMessage, abortAgent, newSession } from '@/services/api-client'
import type { Message } from '@/types'

export function useAgentChat(agentId: string | null) {
  const messages = useAgentStore((s) => s.messages)
  const isTyping = useAgentStore((s) => s.isTyping)
  const currentSessionId = useAgentStore((s) => s.currentSessionId)
  const addMessage = useAgentStore((s) => s.addMessage)
  const updateMessage = useAgentStore((s) => s.updateMessage)
  const updateAgent = useAgentStore((s) => s.updateAgent)
  const setCurrentSessionId = useAgentStore((s) => s.setCurrentSessionId)
  const clearMessages = useAgentStore((s) => s.clearMessages)

  const send = useCallback(
    async (text: string) => {
      if (!agentId) return

      const requestId = crypto.randomUUID()
      const userMessage: Message = {
        id: crypto.randomUUID(),
        agentId,
        sessionId: currentSessionId,
        role: 'user',
        content: text,
        status: 'sent',
        timestamp: Date.now(),
      }

      // 乐观更新：立即添加 user 消息
      addMessage(userMessage)
      updateAgent(agentId, {
        lastMessage: { content: text, timestamp: userMessage.timestamp },
      })

      // Fire-and-forget: POST 只确认 202，不等 assistant reply
      try {
        await sendMessage(agentId, text, requestId)
      } catch {
        updateMessage(userMessage.id, { status: 'error' })
      }
      // assistant 消息由 SSE 驱动添加
    },
    [agentId, currentSessionId, addMessage, updateMessage, updateAgent],
  )

  const abort = useCallback(async () => {
    if (!agentId) return
    try {
      await abortAgent(agentId)
    } catch {
      // ignore
    }
  }, [agentId])

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

  return { messages, isTyping, currentSessionId, send, abort, startNewSession }
}

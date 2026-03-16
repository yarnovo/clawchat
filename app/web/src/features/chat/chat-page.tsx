import { useCallback, useEffect, useState } from 'react'
import {
  ChatHeader,
  MessageList,
  InputArea,
} from './components'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useAgentStore } from '@/stores/agent-store'
import { getAgent } from '@/services/api-client'
import type { Agent } from '@/types'

interface ChatPageProps {
  agentId: string
}

export function ChatPage({ agentId }: ChatPageProps) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const { messages, isTyping, send } = useAgentChat(agentId)
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent)
  const setCurrentSessionId = useAgentStore((s) => s.setCurrentSessionId)
  const setMessages = useAgentStore((s) => s.setMessages)

  useEffect(() => {
    setLoading(true)
    setActiveAgent(agentId)

    // Fetch agent info + message history in parallel
    Promise.all([
      getAgent(agentId).then((data) => {
        setAgent(data.agent)
        setCurrentSessionId(data.agent.currentSessionId ?? 1)
      }),
      fetch(`/api/agents/${agentId}/messages`)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages?.length) setMessages(data.messages)
        }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => setActiveAgent(null)
  }, [agentId, setActiveAgent, setCurrentSessionId, setMessages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    await send(text)
  }, [input, isTyping, send])

  const handleRetry = useCallback((_messageId: string) => {
    // TODO: re-send
  }, [])

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        name={agent?.name ?? ''}
        avatar={agent?.avatar}
        isTyping={isTyping}
      />
      <div className="flex-1 flex flex-col overflow-hidden bg-chat-bg">
        {loading || messages.length === 0 ? (
          <div className="flex-1" />
        ) : (
          <MessageList messages={messages} agentAvatar={agent?.avatar} onRetry={handleRetry} />
        )}
      </div>
      <InputArea
        key={agentId}
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={isTyping}
      />
    </div>
  )
}

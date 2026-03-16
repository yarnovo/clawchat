import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChatHeader,
  MessageList,
  InputArea,
} from './components'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useAgentStore } from '@/stores/agent-store'
import { getAgent } from '@/services/api-client'
import type { Message } from '@/types'

interface ChatPageProps {
  agentId: string
}

async function fetchMessages(agentId: string): Promise<Message[]> {
  const res = await fetch(`/api/agents/${agentId}/messages`)
  if (!res.ok) return []
  const data = await res.json()
  return data.messages ?? []
}

export function ChatPage({ agentId }: ChatPageProps) {
  const [input, setInput] = useState('')
  const { messages, isTyping, send } = useAgentChat(agentId)
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent)
  const setCurrentSessionId = useAgentStore((s) => s.setCurrentSessionId)
  const setMessages = useAgentStore((s) => s.setMessages)

  const { data: agentData } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => getAgent(agentId),
    retry: false,
  })

  const { data: historyMessages } = useQuery({
    queryKey: ['messages', agentId],
    queryFn: () => fetchMessages(agentId),
    retry: false,
  })

  const agent = agentData?.agent ?? null

  useEffect(() => {
    setActiveAgent(agentId)
    if (agent) setCurrentSessionId(agent.currentSessionId ?? 1)
    return () => setActiveAgent(null)
  }, [agentId, agent, setActiveAgent, setCurrentSessionId])

  useEffect(() => {
    if (historyMessages?.length) setMessages(historyMessages)
  }, [historyMessages, setMessages])

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
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {messages.length === 0 ? (
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

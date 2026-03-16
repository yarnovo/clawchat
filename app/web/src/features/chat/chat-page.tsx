import { useCallback, useEffect, useState } from 'react'
import {
  ChatHeader,
  MessageList,
  TypingIndicator,
  InputArea,
  EmptyState,
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
  const [input, setInput] = useState('')
  const { messages, isTyping, send, startNewSession } = useAgentChat(agentId)
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent)
  const setCurrentSessionId = useAgentStore((s) => s.setCurrentSessionId)

  useEffect(() => {
    setActiveAgent(agentId)
    getAgent(agentId)
      .then((data) => {
        setAgent(data.agent)
        setCurrentSessionId(data.agent.currentSessionId ?? 1)
      })
      .catch(() => {})
    return () => setActiveAgent(null)
  }, [agentId, setActiveAgent, setCurrentSessionId])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    await send(text)
  }, [input, isTyping, send])

  const handleRetry = useCallback((_messageId: string) => {
    // TODO: re-send
  }, [])

  const status: 'connected' | 'connecting' | 'disconnected' =
    agent?.status === 'running'
      ? 'connected'
      : agent?.status === 'starting'
        ? 'connecting'
        : 'disconnected'

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader
        name={agent?.name ?? 'Agent'}
        avatar={agent?.avatar}
        status={status}
        onNewSession={startNewSession}
      />
      {messages.length === 0 ? (
        <EmptyState agentName={agent?.name} />
      ) : (
        <MessageList messages={messages} onRetry={handleRetry} />
      )}
      <TypingIndicator visible={isTyping} />
      <InputArea
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={isTyping}
        disabled={agent?.status !== 'running'}
      />
    </div>
  )
}

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

interface ChatPageProps {
  agentId: string
}

export function ChatPage({ agentId }: ChatPageProps) {
  const [input, setInput] = useState('')
  const agents = useAgentStore((s) => s.agents)
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent)
  const { messages, isTyping, send, startNewSession } = useAgentChat(agentId)

  const agent = agents.find((a) => a.id === agentId) ?? null

  useEffect(() => {
    setActiveAgent(agentId)
    return () => setActiveAgent(null)
  }, [agentId, setActiveAgent])

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
        name={agent?.name ?? 'Agent'}
        avatar={agent?.avatar}
      />
      <div className="flex-1 flex flex-col overflow-hidden bg-chat-bg">
        {messages.length === 0 ? (
          <EmptyState agentName={agent?.name} />
        ) : (
          <MessageList messages={messages} onRetry={handleRetry} />
        )}
        <TypingIndicator visible={isTyping} />
      </div>
      <InputArea
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={isTyping}
      />
    </div>
  )
}

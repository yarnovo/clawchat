import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChatHeader,
  MessageList,
  InputArea,
} from './components'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useSSE } from '@/hooks/use-sse'
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
  const { messages, isTyping, send, abort } = useAgentChat(agentId)
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent)
  const setCurrentSessionId = useAgentStore((s) => s.setCurrentSessionId)
  const setMessages = useAgentStore((s) => s.setMessages)

  // 轮询 agent 状态：非 running 时 2s 刷新
  const { data: agentData } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => getAgent(agentId),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.agent?.status
      return status === 'running' ? false : 2000
    },
  })

  const { data: historyMessages } = useQuery({
    queryKey: ['messages', agentId],
    queryFn: () => fetchMessages(agentId),
    retry: false,
  })

  const agent = agentData?.agent ?? null
  const agentStatus = agent?.status ?? 'created'
  const isRunning = agentStatus === 'running'

  // SSE 连接：仅 agent running 时连接
  const sseUrl = isRunning ? `/api/agents/${agentId}/messages/stream` : null
  useSSE(sseUrl)

  useEffect(() => {
    setActiveAgent(agentId)
    if (agent) setCurrentSessionId(agent.currentSessionId ?? 1)
    return () => setActiveAgent(null)
  }, [agentId, agent, setActiveAgent, setCurrentSessionId])

  useEffect(() => {
    if (historyMessages?.length) setMessages(historyMessages)
  }, [historyMessages, setMessages])

  // ESC 全局监听 → abort
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTyping) {
        abort()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isTyping, abort])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    await send(text)
  }, [input, send])

  const handleRetry = useCallback((_messageId: string) => {
    // TODO: re-send
  }, [])

  const statusLabel = agentStatus === 'starting'
    ? '正在启动...'
    : agentStatus === 'created'
      ? '正在创建...'
      : agentStatus === 'error'
        ? '启动失败'
        : undefined

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader
        name={agent?.name ?? ''}
        avatar={agent?.avatar}
        isTyping={isTyping}
        statusLabel={statusLabel}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
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
        onStop={isTyping ? abort : undefined}
        loading={isTyping}
        disabled={!isRunning}
      />
    </div>
  )
}

import { useCallback, useState } from 'react'
import {
  ChatHeader,
  MessageList,
  TypingIndicator,
  InputArea,
  EmptyState,
} from './components'
import type { Message } from '@/types'

interface ChatPageProps {
  agent?: { id: string; name: string; avatar?: string } | null
  connectionStatus?: 'connected' | 'connecting' | 'disconnected'
}

export function ChatPage({
  agent = { id: 'default', name: 'ClawChat Agent' },
  connectionStatus = 'connected',
}: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isTyping) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: 'default',
      role: 'user',
      content: text,
      status: 'sent',
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversationId: 'default',
        role: 'assistant',
        content: data.reply || data.error || 'No response',
        status: 'complete',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        conversationId: 'default',
        role: 'assistant',
        content: 'Connection failed',
        status: 'error',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }, [input, isTyping])

  const handleRetry = useCallback((_messageId: string) => {
    // TODO: re-send
  }, [])

  if (!agent) {
    return (
      <div className="flex h-full flex-col bg-background">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader name={agent.name} avatar={agent.avatar} status={connectionStatus} />
      {messages.length === 0 ? (
        <EmptyState agentName={agent.name} />
      ) : (
        <MessageList messages={messages} onRetry={handleRetry} />
      )}
      <TypingIndicator visible={isTyping} />
      <InputArea value={input} onChange={setInput} onSend={handleSend} loading={isTyping} />
    </div>
  )
}

import { useEffect, useRef, useCallback, useState } from 'react'
import { connectSSE } from '@/services/sse-client'
import { useAgentStore } from '@/stores/agent-store'
import type { SSEEvent } from '@/types'

type SSEStatus = 'connecting' | 'connected' | 'disconnected'

const MAX_BACKOFF = 30_000
const INITIAL_BACKOFF = 1_000

export function useSSE(url: string | null) {
  const [status, setStatus] = useState<SSEStatus>('disconnected')
  const backoffRef = useRef(INITIAL_BACKOFF)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const connectionRef = useRef<{ close: () => void } | null>(null)

  const addMessage = useAgentStore((s) => s.addMessage)
  const setTyping = useAgentStore((s) => s.setTyping)
  const activeAgentId = useAgentStore((s) => s.activeAgentId)
  const currentSessionId = useAgentStore((s) => s.currentSessionId)

  const connect = useCallback(() => {
    if (!url) return

    connectionRef.current?.close()
    setStatus('connecting')

    const conn = connectSSE(
      url,
      (event: SSEEvent) => {
        switch (event.type) {
          case 'connected':
            setStatus('connected')
            backoffRef.current = INITIAL_BACKOFF
            break
          case 'typing':
            setTyping(true)
            break
          case 'assistant':
            setTyping(false)
            if (activeAgentId) {
              addMessage({
                id: crypto.randomUUID(),
                agentId: activeAgentId,
                sessionId: currentSessionId,
                role: 'assistant',
                content: event.content,
                status: 'complete',
                requestId: event.requestId,
                timestamp: Date.now(),
              })
            }
            break
        }
      },
      (_error: Error) => {
        setStatus('disconnected')
        setTyping(false)
        scheduleReconnect()
      },
    )

    connectionRef.current = conn
  }, [url, activeAgentId, currentSessionId, addMessage, setTyping])

  const scheduleReconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
      connect()
    }, backoffRef.current)
  }, [connect])

  const reconnect = useCallback(() => {
    backoffRef.current = INITIAL_BACKOFF
    connect()
  }, [connect])

  // Connect on mount / url change
  useEffect(() => {
    if (!url) {
      setStatus('disconnected')
      return
    }

    connect()

    return () => {
      clearTimeout(reconnectTimerRef.current)
      connectionRef.current?.close()
    }
  }, [url, connect])

  // Reconnect on visibility change (WebView compat)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && status === 'disconnected' && url) {
        reconnect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [status, url, reconnect])

  return { status, reconnect }
}

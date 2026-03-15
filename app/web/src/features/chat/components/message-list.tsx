import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  onRetry?: (messageId: string) => void
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Track whether user has scrolled up
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Consider "at bottom" if within 60px of the bottom
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 60)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isAtBottom])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Send a message to start</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4 py-4 sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRetry={onRetry}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <button
        type="button"
        onClick={scrollToBottom}
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-md transition-all hover:text-foreground',
          isAtBottom
            ? 'pointer-events-none translate-y-4 opacity-0'
            : 'translate-y-0 opacity-100',
        )}
      >
        <ArrowDown className="size-3" />
        New messages
      </button>
    </div>
  )
}

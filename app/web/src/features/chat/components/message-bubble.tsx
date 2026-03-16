import { Bot, RotateCw, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  onRetry?: (messageId: string) => void
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isSending = message.status === 'sending'

  return (
    <div
      className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <Avatar size="default" className="shrink-0 mt-0.5">
        <AvatarFallback className={isUser ? 'bg-primary/10' : 'bg-muted'}>
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Bubble + meta */}
      <div className={cn('flex max-w-[70%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative rounded-lg px-3 py-2.5',
            isUser
              ? 'bg-chat-user text-chat-user-foreground'
              : 'bg-card text-card-foreground shadow-sm',
            isSending && 'opacity-50',
            isError && !isUser && 'border border-destructive/30 bg-destructive/5',
            isError && isUser && 'bg-destructive/80',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 px-1 text-[11px] text-muted-foreground',
            isUser ? 'justify-end' : 'justify-start',
          )}
        >
          <span>{formatTime(message.timestamp)}</span>

          {isSending && (
            <span className="text-muted-foreground/60">Sending...</span>
          )}

          {isError && (
            <button
              type="button"
              onClick={() => onRetry?.(message.id)}
              className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80"
            >
              <RotateCw className="size-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

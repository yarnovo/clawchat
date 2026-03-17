import { RotateCw } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  agentAvatar?: string
  onRetry?: (messageId: string) => void
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-600",
  "bg-red-500",
]

function getAvatarColor(id: string) {
  let hash = 0
  for (const ch of id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// User avatar — same DiceBear style as agents
const USER_AVATAR = 'https://api.dicebear.com/9.x/notionists/svg?seed=self'

export function MessageBubble({ message, agentAvatar, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isSending = message.status === 'sending'

  const avatarSrc = isUser ? USER_AVATAR : agentAvatar

  return (
    <div
      className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar — unified rounded-lg square style */}
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          className="size-8 shrink-0 rounded-lg bg-muted object-cover mt-0.5"
        />
      ) : (
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-medium mt-0.5",
            getAvatarColor(message.agentId),
          )}
        >
          {isUser ? 'U' : 'A'}
        </div>
      )}

      {/* Bubble + meta */}
      <div className={cn('flex max-w-[70%] min-w-0 flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative rounded-lg px-3 py-2.5 overflow-hidden max-w-full',
            isUser
              ? 'bg-chat-user text-chat-user-foreground'
              : 'bg-muted text-foreground',
            isSending && 'opacity-50',
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

          {isError && (
            <button
              type="button"
              onClick={() => onRetry?.(message.id)}
              className="inline-flex items-center gap-1 text-destructive/70 hover:text-destructive"
            >
              <RotateCw className="size-3" />
              发送失败，点击重试
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

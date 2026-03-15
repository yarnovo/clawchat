import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

interface ChatHeaderProps {
  name: string
  avatar?: string
  status: ConnectionStatus
}

const statusConfig: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: 'bg-emerald-500', label: 'Connected' },
  connecting: { color: 'bg-amber-500', label: 'Connecting...' },
  disconnected: { color: 'bg-red-500', label: 'Disconnected' },
}

export function ChatHeader({ name, avatar, status }: ChatHeaderProps) {
  const { color, label } = statusConfig[status]

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
      <Avatar>
        {avatar ? (
          <AvatarImage src={avatar} alt={name} />
        ) : null}
        <AvatarFallback>
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <h2 className="text-sm font-semibold text-foreground">{name}</h2>
        <div className="flex items-center gap-1.5">
          <span
            className={cn('size-1.5 rounded-full', color)}
            aria-hidden="true"
          />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      </div>
    </header>
  )
}

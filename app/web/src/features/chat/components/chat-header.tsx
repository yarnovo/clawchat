import { ChevronLeft } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'

interface ChatHeaderProps {
  name: string
  avatar?: string
  isTyping?: boolean
}

export function ChatHeader({ name, isTyping }: ChatHeaderProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const navigate = useNavigate()

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-2 md:px-5">
      {!isDesktop && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate({ to: '/chat' })}
          className="-ml-1"
        >
          <ChevronLeft className="size-5" />
        </Button>
      )}
      <div>
        <h2 className="text-sm font-semibold text-foreground">{name}</h2>
        {isTyping && (
          <p className="text-[11px] text-muted-foreground">正在输入...</p>
        )}
      </div>
    </header>
  )
}

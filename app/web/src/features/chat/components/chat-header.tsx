import { useNavigate } from '@tanstack/react-router'
import { useMediaQuery } from '@/hooks/use-media-query'
import { PageHeader } from '@/components/ui/page-header'

interface ChatHeaderProps {
  name: string
  avatar?: string
  isTyping?: boolean
}

export function ChatHeader({ name, isTyping }: ChatHeaderProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const navigate = useNavigate()

  return (
    <PageHeader
      title={name}
      onBack={!isDesktop ? () => navigate({ to: '/chat' }) : undefined}
    >
      {isTyping && (
        <p className="ml-2 text-[11px] text-muted-foreground">正在输入...</p>
      )}
    </PageHeader>
  )
}

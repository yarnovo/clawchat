import { useMediaQuery } from '@/hooks/use-media-query'
import { PageHeader } from '@/components/ui/page-header'
import { useAnimatedBack } from '@/hooks/use-back-navigation'

interface ChatHeaderProps {
  name: string
  avatar?: string
  isTyping?: boolean
  statusLabel?: string
}

export function ChatHeader({ name, isTyping, statusLabel }: ChatHeaderProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const animatedBack = useAnimatedBack()

  return (
    <PageHeader
      title={name}
      onBack={!isDesktop ? animatedBack : undefined}
      status={statusLabel || (isTyping ? '正在输入...' : undefined)}
    />
  )
}

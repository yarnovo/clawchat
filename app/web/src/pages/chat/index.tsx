import { Outlet, useMatches } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'

export default function ChatPage() {
  const matches = useMatches()
  const hasChildRoute = matches.some((m) => m.routeId === '/chat/$agentId')

  return (
    <>
      {hasChildRoute ? (
        <Outlet />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-chat-bg">
          <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
            <MessageCircle className="size-20 stroke-1" />
            <p className="text-sm text-muted-foreground/50">ClawChat</p>
          </div>
        </div>
      )}
    </>
  )
}

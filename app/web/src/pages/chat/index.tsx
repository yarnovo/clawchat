import { Outlet, useMatches } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  // Check if any child route is active (e.g., /chat/$agentId)
  const matches = useMatches()
  const hasChildRoute = matches.some((m) => m.routeId === '/chat/$agentId')

  return (
    <>
      {hasChildRoute ? (
        <Outlet />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <MessageSquare className="size-12 stroke-1" />
            <h2 className="text-lg font-medium text-foreground">
              Welcome to ClawChat
            </h2>
            <p className="text-sm">Select an agent to start chatting</p>
          </div>
        </div>
      )}
    </>
  )
}

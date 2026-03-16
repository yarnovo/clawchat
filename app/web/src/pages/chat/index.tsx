import { Outlet, useMatches } from '@tanstack/react-router'

export default function ChatPage() {
  const matches = useMatches()
  const hasChildRoute = matches.some((m) => m.routeId === '/chat/$agentId')

  return hasChildRoute ? (
    <Outlet />
  ) : (
    <div className="flex-1 bg-background" />
  )
}

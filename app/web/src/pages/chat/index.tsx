import { Outlet, useParams } from '@tanstack/react-router'

export default function ChatPage() {
  const params = useParams({ strict: false }) as { agentId?: string }
  const hasChildRoute = !!params.agentId

  return hasChildRoute ? (
    <Outlet />
  ) : (
    <div className="flex-1 bg-background" />
  )
}

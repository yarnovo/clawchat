import { Outlet, useNavigate, useParams } from "@tanstack/react-router"
import { AgentList } from "@/components/layout/agent-list"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function AgentsPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { agentId?: string }
  const agentId = params.agentId ?? null
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const handleSelect = (id: string) => {
    navigate({ to: "/agents/$agentId", params: { agentId: id } })
  }

  // Mobile: AppShell base layer 已渲染 AgentList，这里只处理详情
  if (!isDesktop) {
    return agentId ? <Outlet /> : null
  }

  // Desktop: side-by-side
  return (
    <div className="flex h-full">
      <AgentList
        selectedAgentId={agentId}
        onAgentSelect={handleSelect}
      />

      {agentId ? (
        <Outlet />
      ) : (
        <div className="flex-1 bg-background" />
      )}
    </div>
  )
}

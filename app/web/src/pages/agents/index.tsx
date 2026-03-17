import { useQuery } from "@tanstack/react-query"
import { Outlet, useNavigate, useParams } from "@tanstack/react-router"
import { AgentList } from "@/components/layout/agent-list"
import { listAgents } from "@/services/api-client"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function AgentsPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { agentId?: string }
  const agentId = params.agentId ?? null

  const { data } = useQuery({
    queryKey: ["agents"],
    queryFn: () => listAgents(),
  })
  const agents = data?.agents ?? []
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const handleSelect = (id: string) => {
    navigate({ to: "/agents/$agentId", params: { agentId: id } })
  }

  const handleBack = () => {
    navigate({ to: "/agents" })
  }

  // Mobile: toggle between list and detail
  if (!isDesktop) {
    if (agentId) {
      return <Outlet />
    }
    return (
      <AgentList
        className="w-full border-r-0"
        selectedAgentId={agentId}
        onAgentSelect={handleSelect}
      />
    )
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

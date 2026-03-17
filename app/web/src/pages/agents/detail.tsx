import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate } from "@tanstack/react-router"
import { AgentDetail } from "@/features/agents/agent-detail"
import { getAgent } from "@/services/api-client"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function AgentDetailPage() {
  const { agentId } = useParams({ strict: false }) as { agentId: string }
  const navigate = useNavigate()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const { data } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
  })

  const agent = data?.agent
  if (!agent) return null

  return (
    <AgentDetail
      agent={agent}
      onBack={isDesktop ? undefined : () => navigate({ to: "/agents" })}
      onDeleted={() => navigate({ to: "/agents" })}
    />
  )
}

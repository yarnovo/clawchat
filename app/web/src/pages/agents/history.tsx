import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate, useSearch } from "@tanstack/react-router"
import { PageHeader } from "@/components/ui/page-header"
import { MessageList } from "@/features/chat/components"
import { getAgent, getSessionMessages } from "@/services/api-client"

export default function AgentHistoryPage() {
  const { agentId } = useParams({ strict: false }) as { agentId: string }
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { session?: number; title?: string }
  const sessionId = search.session ?? 1
  const title = search.title

  const { data: agentData } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
  })

  const { data: historyData } = useQuery({
    queryKey: ["session-messages", agentId, sessionId],
    queryFn: () => getSessionMessages(agentId, sessionId),
  })

  const agent = agentData?.agent
  const msgs = historyData?.messages ?? []

  return (
    <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-background">
      <PageHeader
        title={title || agent?.name || "返回"}
        onBack={() => navigate({ to: "/agents/$agentId", params: { agentId } })}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {msgs.length === 0 ? (
          <div className="flex-1" />
        ) : (
          <MessageList messages={msgs} agentAvatar={agent?.avatar} />
        )}
      </div>
    </div>
  )
}

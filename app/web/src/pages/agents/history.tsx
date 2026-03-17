import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate, useSearch } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
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
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <button
          onClick={() => navigate({ to: "/agents/$agentId", params: { agentId } })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-5" />
          {title || agent?.name || "返回"}
        </button>
      </div>
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

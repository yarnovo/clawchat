import { useQuery } from "@tanstack/react-query"
import { useParams, useSearch } from "@tanstack/react-router"
import { PageHeader } from "@/components/ui/page-header"
import { useScrolled } from "@/hooks/use-scrolled"
import { MessageList } from "@/features/chat/components"
import { getAgent, getSessionMessages } from "@/services/api-client"
import { useAnimatedBack } from "@/hooks/use-back-navigation"

export default function AgentHistoryPage() {
  const { agentId } = useParams({ strict: false }) as { agentId: string }
  const animatedBack = useAnimatedBack()
  const search = useSearch({ strict: false }) as { session?: number; title?: string }
  const sessionId = search.session ?? 1
  const title = search.title
  const [scrollRef, scrolled] = useScrolled()

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
        onBack={animatedBack}
        scrolled={scrolled}
      />
      <div ref={scrollRef} className="flex-1 flex flex-col overflow-hidden">
        {msgs.length === 0 ? (
          <div className="flex-1" />
        ) : (
          <MessageList messages={msgs} agentAvatar={agent?.avatar} />
        )}
      </div>
    </div>
  )
}

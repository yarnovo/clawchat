import { useState } from "react"
import { useSearch } from "@tanstack/react-router"
import { Store } from "lucide-react"
import { AgentList } from "@/components/layout/agent-list"
import { AgentDetail } from "@/features/agents/agent-detail"
import { useAgentStore } from "@/stores/agent-store"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function AgentsPage() {
  const { focus } = useSearch({ from: "/agents" })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const agents = useAgentStore((s) => s.agents)
  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Mobile: toggle between list and detail
  if (!isDesktop) {
    if (selectedAgent) {
      return (
        <AgentDetail
          agent={selectedAgent}
          onBack={() => setSelectedId(null)}
        />
      )
    }
    return (
      <AgentList
        className="w-full border-r-0"
        selectedAgentId={selectedId}
        onAgentSelect={setSelectedId}
        autoFocusSearch={focus === "search"}
      />
    )
  }

  // Desktop: side-by-side
  return (
    <div className="flex h-full">
      <AgentList
        selectedAgentId={selectedId}
        onAgentSelect={setSelectedId}
        autoFocusSearch={focus === "search"}
      />

      {selectedAgent ? (
        <AgentDetail agent={selectedAgent} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
            <Store className="size-16 stroke-1" />
            <p className="text-sm text-muted-foreground/50">
              选择一个 Agent 查看详情
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

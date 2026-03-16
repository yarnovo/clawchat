import { useState } from "react"
import { AgentList } from "@/components/layout/agent-list"
import { AgentDetail } from "@/features/agents/agent-detail"
import { useAgentStore } from "@/stores/agent-store"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function AgentsPage() {
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
      />
    )
  }

  // Desktop: side-by-side
  return (
    <div className="flex h-full">
      <AgentList
        selectedAgentId={selectedId}
        onAgentSelect={setSelectedId}
      />

      {selectedAgent ? (
        <AgentDetail agent={selectedAgent} />
      ) : (
        <div className="flex-1" />
      )}
    </div>
  )
}

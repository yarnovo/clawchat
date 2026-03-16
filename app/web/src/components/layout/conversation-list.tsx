import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useAgentStore } from "@/stores/agent-store"
import { listAgents } from "@/services/api-client"

interface ConversationListProps {
  className?: string
  activeAgentId?: string
  onAgentSelect?: (agentId: string) => void
  onNavigate?: (page: "chat" | "agents") => void
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-600",
  "bg-red-500",
]

function getAvatarColor(id: string) {
  let hash = 0
  for (const ch of id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function ConversationList({
  className,
  activeAgentId,
  onAgentSelect,
}: ConversationListProps) {
  const navigate = useNavigate()
  const agents = useAgentStore((s) => s.agents)
  const setAgents = useAgentStore((s) => s.setAgents)

  useEffect(() => {
    listAgents()
      .then((data) => setAgents(data.agents))
      .catch(() => {})
  }, [setAgents])

  return (
    <div
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border",
        className,
      )}
    >
      {/* Search — same height as ChatHeader */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索"
            className="h-8 rounded-md bg-sidebar-accent/60 border-0 pl-8 text-xs focus:bg-sidebar-accent"
          />
        </div>
        <button
          onClick={() =>
            navigate({ to: "/agents", search: { focus: "search" } })
          }
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {agents.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              暂无会话
            </p>
          ) : (
            agents.map((agent) => {
              const isActive = activeAgentId === agent.id

              return (
                <button
                  key={agent.id}
                  onClick={() => onAgentSelect?.(agent.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                    "hover:bg-sidebar-accent/60",
                    isActive && "bg-sidebar-accent",
                  )}
                >
                  {agent.avatar ? (
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="size-10 shrink-0 rounded-lg bg-muted object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg text-white text-sm font-medium",
                        getAvatarColor(agent.id),
                      )}
                    >
                      {agent.name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="truncate text-sm font-medium text-sidebar-foreground block">
                      {agent.name}
                    </span>
                    {agent.description && (
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {agent.description}
                      </p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

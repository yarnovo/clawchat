import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { listConversations } from "@/services/api-client"

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

function formatRelativeTime(timestamp: number): string {
  const today = new Date()
  const date = new Date(timestamp)

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return "昨天"

  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7)
    return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]

  if (date.getFullYear() === today.getFullYear())
    return `${date.getMonth() + 1}/${date.getDate()}`

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function getPlainPreview(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "[代码]")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n/g, " ")
    .trim()
}

export function ConversationList({
  className,
  activeAgentId,
  onAgentSelect,
}: ConversationListProps) {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
  })

  const sortedAgents = useMemo(() => {
    const agents = data?.agents ?? []
    return [...agents].sort((a, b) => {
      const aTime = a.lastMessage?.timestamp ?? 0
      const bTime = b.lastMessage?.timestamp ?? 0
      return bTime - aTime
    })
  }, [data])

  return (
    <div
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border",
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索对话..."
            className="h-8 rounded-md bg-sidebar-accent/60 border-0 pl-8 text-xs focus:bg-sidebar-accent"
          />
        </div>
      </div>

      {sortedAgents.length === 0 ? (
        <EmptyState action={{ label: "去创建 Agent", onClick: () => navigate({ to: "/agents" }) }} />
      ) : (
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {sortedAgents.map((agent) => {
            const isActive = activeAgentId === agent.id
            const last = agent.lastMessage

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
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
                      {agent.name}
                    </span>
                    {last && (
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                        {formatRelativeTime(last.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {last
                      ? getPlainPreview(last.content)
                      : agent.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
      )}
    </div>
  )
}

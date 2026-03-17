import { useEffect } from "react"
import {
  MessageSquarePlus,
  Search,
  Store,
  Settings,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAgentStore } from "@/stores/agent-store"
import { listAgents } from "@/services/api-client"

interface SidebarProps {
  className?: string
  activeAgentId?: string
  onAgentSelect?: (agentId: string) => void
  onNavigate?: (page: "agents" | "settings") => void
}

const statusColors: Record<string, string> = {
  running: "bg-emerald-500",
  starting: "bg-amber-500",
  stopped: "bg-gray-400",
  error: "bg-red-500",
  created: "bg-gray-400",
}

export function Sidebar({
  className,
  activeAgentId,
  onAgentSelect,
  onNavigate,
}: SidebarProps) {
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
        "flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
          <span className="text-base font-semibold">ClawChat</span>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onNavigate?.("agents")}
              >
                <MessageSquarePlus className="size-4" />
              </Button>
            }
          />
          <TooltipContent side="bottom">New Agent</TooltipContent>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <Separator />

      {/* Agent list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {agents.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No agents yet
            </p>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onAgentSelect?.(agent.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activeAgentId === agent.id &&
                    "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <div className="relative">
                  <Avatar size="default">
                    <AvatarFallback>
                      <Bot className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar",
                      statusColors[agent.status] ?? "bg-gray-400"
                    )}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <span className="truncate text-sm font-medium block">
                    {agent.name}
                  </span>
                  {agent.description && (
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {agent.description}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onNavigate?.("agents")}
                >
                  <Store className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Manage Agents</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onNavigate?.("settings")}
                >
                  <Settings className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-sidebar-accent">
          <Avatar size="sm">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">User</span>
        </button>
      </div>
    </div>
  )
}

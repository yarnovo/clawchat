import { useRef, useEffect, useState } from "react"
import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useAgentStore } from "@/stores/agent-store"
import { AGENT_CATEGORIES } from "@/data/mock-data"

interface AgentListProps {
  className?: string
  selectedAgentId?: string | null
  onAgentSelect?: (agentId: string) => void
  autoFocusSearch?: boolean
}

const AVATAR_COLORS = [
  { id: "blue", bg: "bg-blue-500", label: "蓝" },
  { id: "emerald", bg: "bg-emerald-500", label: "绿" },
  { id: "orange", bg: "bg-orange-500", label: "橙" },
  { id: "purple", bg: "bg-purple-500", label: "紫" },
  { id: "pink", bg: "bg-pink-500", label: "粉" },
  { id: "cyan", bg: "bg-cyan-500", label: "青" },
  { id: "amber", bg: "bg-amber-600", label: "琥" },
  { id: "red", bg: "bg-red-500", label: "红" },
]

function getAvatarColor(id: string) {
  let hash = 0
  for (const ch of id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length].bg
}

export function AgentList({
  className,
  selectedAgentId,
  onAgentSelect,
  autoFocusSearch = false,
}: AgentListProps) {
  const agents = useAgentStore((s) => s.agents)
  const addAgent = useAgentStore((s) => s.addAgent)
  const agentMap = new Map(agents.map((a) => [a.id, a]))

  const searchRef = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0].bg)
  const [newDesc, setNewDesc] = useState("")

  useEffect(() => {
    if (autoFocusSearch) {
      searchRef.current?.focus()
    }
  }, [autoFocusSearch])

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return

    addAgent({
      id: `agent-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name,
      description: newDesc.trim(),
      status: "running",
      currentSessionId: 1,
      resourceProfile: "standard",
      skills: [],
      createdAt: new Date().toISOString(),
    })

    setNewName("")
    setNewColor(AVATAR_COLORS[0].bg)
    setNewDesc("")
    setDialogOpen(false)
  }

  return (
    <div
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border",
        className,
      )}
    >
      {/* Search + Add */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="搜索"
            className="h-8 rounded-md bg-sidebar-accent/60 border-0 pl-8 text-xs focus:bg-sidebar-accent"
          />
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Categorized agent list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {AGENT_CATEGORIES.map((category) => {
            const categoryAgents = category.agentIds
              .map((id) => agentMap.get(id))
              .filter(Boolean)

            return (
              <div key={category.name}>
                {/* Category header */}
                <div className="px-3 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {category.name}
                  </span>
                </div>

                {/* Agent items */}
                {categoryAgents.map((agent) => {
                  if (!agent) return null
                  const isSelected = selectedAgentId === agent.id

                  return (
                    <button
                      key={agent.id}
                      onClick={() => onAgentSelect?.(agent.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        "hover:bg-sidebar-accent/60",
                        isSelected && "bg-sidebar-accent",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg text-white text-sm font-medium",
                          getAvatarColor(agent.id),
                        )}
                      >
                        {agent.name.charAt(0)}
                      </div>
                      <span className="truncate text-sm text-sidebar-foreground">
                        {agent.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Create Agent Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>创建 Agent</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                名称 <span className="text-destructive">*</span>
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如: MyBot"
                autoFocus
              />
            </div>

            {/* Avatar color */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                头像颜色 <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewColor(c.bg)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg text-white text-xs font-medium transition-all",
                      c.bg,
                      newColor === c.bg
                        ? "ring-2 ring-primary ring-offset-2"
                        : "opacity-60 hover:opacity-100",
                    )}
                  >
                    {newName.trim() ? newName.trim().charAt(0).toUpperCase() : "A"}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">描述</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="这个 Agent 能做什么..."
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

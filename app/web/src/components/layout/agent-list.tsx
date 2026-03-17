import { useRef, useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import { EmptyState } from "@/components/ui/empty-state"
import { listAgents, createAgent } from "@/services/api-client"

interface AgentListProps {
  className?: string
  selectedAgentId?: string | null
  onAgentSelect?: (agentId: string) => void
  autoFocusSearch?: boolean
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

interface CreateAgentForm {
  name: string
  category: string
  description: string
}

export function AgentList({
  className,
  selectedAgentId,
  onAgentSelect,
  autoFocusSearch = false,
}: AgentListProps) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["agents"],
    queryFn: () => listAgents(),
  })
  const agents = data?.agents ?? []

  const searchRef = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [avatarSeed, setAvatarSeed] = useState(() => String(Date.now()))

  const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(avatarSeed)}`

  const { register, handleSubmit, reset, formState: { isValid } } = useForm<CreateAgentForm>({
    mode: "onChange",
  })

  const grouped = useMemo(() => {
    const map = new Map<string, typeof agents>()
    for (const agent of agents) {
      const cat = agent.category ?? "其他"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(agent)
    }
    return [...map.entries()]
  }, [agents])

  const onCreateSubmit = async (formData: CreateAgentForm) => {
    try {
      await createAgent({
        name: formData.name,
        description: formData.description,
        avatar: avatarUrl,
        category: formData.category,
      })
      await queryClient.invalidateQueries({ queryKey: ["agents"] })
    } catch {
      // ignore — backend not ready
    }

    reset()
    setAvatarSeed(String(Date.now()))
    setDialogOpen(false)
  }

  return (
    <div
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border",
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="搜索 Agent..."
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

      {agents.length === 0 ? (
        <EmptyState action={{ label: "创建 Agent", onClick: () => setDialogOpen(true) }} />
      ) : (
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {grouped.map(([category, categoryAgents]) => (
            <div key={category}>
              <div className="px-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {category}
                </span>
              </div>

              {categoryAgents.map((agent) => {
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
                    {agent.avatar ? (
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="size-9 shrink-0 rounded-lg bg-muted object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg text-white text-sm font-medium",
                          getAvatarColor(agent.id),
                        )}
                      >
                        {agent.name.charAt(0)}
                      </div>
                    )}
                    <span className="truncate text-sm text-sidebar-foreground">
                      {agent.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
      )}

      {/* Create Agent Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>创建 Agent</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateSubmit)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                名称 <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("name", { required: true })}
                placeholder="例如: MyBot"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                头像 <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl}
                  alt="avatar preview"
                  className="size-14 rounded-xl bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAvatarSeed(String(Date.now()))}
                >
                  随机换一个
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                分类 <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("category", { required: true })}
                placeholder="例如: 编程开发"
                list="category-options"
              />
              <datalist id="category-options">
                {[...new Set(agents.map((a) => a.category).filter(Boolean))].map(
                  (cat) => (
                    <option key={cat} value={cat} />
                  ),
                )}
              </datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">描述</label>
              <textarea
                {...register("description")}
                placeholder="这个 Agent 能做什么..."
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={!isValid}>
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

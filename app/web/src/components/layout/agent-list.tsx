import { useRef, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/ui/empty-state"
import { listAgents, createAgent } from "@/services/api-client"

interface AgentListProps {
  className?: string
  selectedAgentId?: string | null
  onAgentSelect?: (agentId: string) => void
  autoFocusSearch?: boolean
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

  const { register, handleSubmit, reset, watch, setValue, formState: { isValid } } = useForm<CreateAgentForm>({
    mode: "onChange",
  })
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [categoryHighlight, setCategoryHighlight] = useState(-1)
  const categoryValue = watch("category") ?? ""
  const categoryOptions = useMemo(
    () => [...new Set(agents.map((a) => a.category).filter(Boolean))] as string[],
    [agents],
  )
  const filteredCategories = categoryOptions.filter(
    (cat) => cat.toLowerCase().includes(categoryValue.toLowerCase()),
  )

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
      <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-sidebar-border px-3">
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
        <EmptyState text="还没有 Agent" action={{ label: "创建 Agent", onClick: () => setDialogOpen(true) }} />
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
                      "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                      "hover:bg-sidebar-accent/60",
                      isSelected && "bg-sidebar-accent",
                    )}
                  >
                    <img
                      src={agent.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(agent.name)}`}
                      alt={agent.name}
                      className="size-10 shrink-0 rounded-lg bg-muted object-cover"
                    />
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
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
      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent className="sm:max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>创建 Agent</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSubmit(onCreateSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                名称 <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("name", { required: true })}
                placeholder="例如: MyBot"
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
              <div className="relative">
                <Input
                  {...register("category", { required: true })}
                  placeholder="例如: 编程开发"
                  autoComplete="off"
                  onFocus={() => {
                    setCategoryDropdownOpen(true)
                    setCategoryHighlight(-1)
                  }}
                  onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (!categoryDropdownOpen || filteredCategories.length === 0) return
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setCategoryHighlight((i) => (i + 1) % filteredCategories.length)
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault()
                      setCategoryHighlight((i) => (i <= 0 ? filteredCategories.length - 1 : i - 1))
                    } else if (e.key === "Enter" && categoryHighlight >= 0) {
                      e.preventDefault()
                      setValue("category", filteredCategories[categoryHighlight], { shouldValidate: true })
                      setCategoryDropdownOpen(false)
                      setCategoryHighlight(-1)
                    } else if (e.key === "Escape") {
                      setCategoryDropdownOpen(false)
                      setCategoryHighlight(-1)
                    }
                  }}
                  onChange={(e) => {
                    register("category", { required: true }).onChange(e)
                    setCategoryDropdownOpen(true)
                    setCategoryHighlight(-1)
                  }}
                />
                {categoryDropdownOpen && filteredCategories.length > 0 && (
                  <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                    {filteredCategories.map((cat, i) => (
                      <button
                        key={cat}
                        type="button"
                        className={cn(
                          "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                          i === categoryHighlight && "bg-accent",
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setValue("category", cat, { shouldValidate: true })
                          setCategoryDropdownOpen(false)
                          setCategoryHighlight(-1)
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                {...register("description")}
                placeholder="这个 Agent 能做什么..."
                rows={3}
                className="resize-none"
              />
            </div>

            <ResponsiveDialogFooter>
              <Button type="submit" disabled={!isValid}>
                创建
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

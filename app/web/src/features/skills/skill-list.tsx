import { useQuery } from "@tanstack/react-query"
import { Package, Search } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { listSkills } from "@/services/api-client"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import type { Skill } from "@/types"

interface SkillListProps {
  selectedSkillName: string | null
  onSkillSelect: (name: string) => void
  className?: string
}

export function SkillList({ selectedSkillName, onSkillSelect, className }: SkillListProps) {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => listSkills(),
  })

  const skills = data?.skills ?? []
  const filtered = search
    ? skills.filter(
        (s) =>
          s.displayName.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase()),
      )
    : skills

  return (
    <div className={cn("flex h-full w-[280px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border", className)}>
      {/* Header with search */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索技能..."
            className="h-8 rounded-md bg-accent/60 border-0 pl-8 text-xs focus:bg-accent"
          />
        </div>
      </div>

      {/* List */}
      {!isLoading && filtered.length === 0 ? (
        <EmptyState text={search ? "没有匹配的技能" : "暂无技能"} />
      ) : (
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground/60">
            加载中...
          </div>
        )}

        {filtered.map((skill) => (
          <SkillItem
            key={skill.name}
            skill={skill}
            isActive={selectedSkillName === skill.name}
            onClick={() => onSkillSelect(skill.name)}
          />
        ))}
      </div>
      )}
    </div>
  )
}

function SkillItem({
  skill,
  isActive,
  onClick,
}: {
  skill: Skill
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        isActive
          ? "bg-accent"
          : "hover:bg-accent/50",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Package className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{skill.displayName}</span>
          <span className="text-[10px] text-muted-foreground">v{skill.version}</span>
        </div>
        {skill.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {skill.description}
          </p>
        )}
      </div>
    </button>
  )
}

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Package, File } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useScrolled } from "@/hooks/use-scrolled"
import { listSkills, getSkill } from "@/services/api-client"
import type { Skill } from "@/types"

interface SkillMarketplaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SkillMarketplaceDialog({ open, onOpenChange }: SkillMarketplaceDialogProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedName(null) }}>
      <DialogContent className="max-w-2xl h-[70vh] max-h-[70vh] p-0 gap-0 flex flex-col overflow-hidden">
        {selectedName ? (
          <DetailView
            skillName={selectedName}
            onBack={() => setSelectedName(null)}
          />
        ) : (
          <ListView onSelect={setSelectedName} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ListView({ onSelect }: { onSelect: (name: string) => void }) {
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
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Package className="size-5 text-muted-foreground" />
        <h2 className="text-sm font-semibold flex-1">技能市场</h2>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-xs text-muted-foreground/60">
            加载中...
          </div>
        )}


        <div className="grid grid-cols-1 gap-px bg-border">
          {filtered.map((skill) => (
            <SkillCard key={skill.name} skill={skill} onClick={() => onSelect(skill.name)} />
          ))}
        </div>
      </ScrollArea>
    </>
  )
}

function SkillCard({ skill, onClick }: { skill: Skill; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 bg-background px-4 py-3 text-left hover:bg-accent/50 transition-colors"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Package className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{skill.displayName}</span>
          <span className="text-[10px] text-muted-foreground">v{skill.version}</span>
        </div>
        {skill.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
        )}
      </div>
    </button>
  )
}

function DetailView({ skillName, onBack }: { skillName: string; onBack: () => void }) {
  const [scrollRef, scrolled] = useScrolled()
  const { data: skillData, isLoading } = useQuery({
    queryKey: ["skill", skillName],
    queryFn: () => getSkill(skillName),
  })

  const skill = skillData?.skill

  return (
    <>
      {/* Header */}
      <PageHeader title="返回" onBack={onBack} scrolled={scrolled} />

      {/* Content */}
      <ScrollArea viewportRef={scrollRef} className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-xs text-muted-foreground/60">
            加载中...
          </div>
        ) : skill ? (
          <div className="px-6 py-5 space-y-5">
            {/* Title */}
            <div>
              <h2 className="text-base font-semibold">{skill.displayName}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{skill.name} · v{skill.version}</p>
              {skill.description && (
                <p className="mt-2 text-sm text-foreground">{skill.description}</p>
              )}
            </div>

            {/* Files */}
            {skill.files.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">包含文件</h3>
                <div className="space-y-1">
                  {skill.files.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <File className="size-3.5 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SKILL.md */}
            {skill.content && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">说明文档</h3>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-muted rounded-lg p-4 overflow-auto max-h-48">
                  {skill.content}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </ScrollArea>

      {/* Footer */}
      {skill && (
        <div className="shrink-0 border-t border-border px-6 py-3">
          <InstallPrompt skillName={skillName} />
        </div>
      )}
    </>
  )
}

function InstallPrompt({ skillName }: { skillName: string }) {
  const [copied, setCopied] = useState(false)
  const prompt = `请安装技能 "${skillName}"，运行：bash skills/skill-manager/scripts/install-skill.sh "${skillName}"`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleCopy}
      >
        {copied ? "已复制，发送给 Agent 即可安装" : "复制安装指令"}
      </Button>
    </div>
  )
}

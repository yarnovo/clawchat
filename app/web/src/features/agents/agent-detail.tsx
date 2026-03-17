import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, MessageCircle, MoreVertical, Trash2, ChevronRight } from "lucide-react"
import { deleteAgent, getChatSessions } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types"

interface AgentDetailProps {
  agent: Agent
  onBack?: () => void
  onDeleted?: () => void
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
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 60_000) return "刚刚"
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  return `${Math.floor(diff / 86400_000)} 天前`
}

export function AgentDetail({ agent, onBack, onDeleted }: AgentDetailProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => deleteAgent(agent.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
      setDeleteOpen(false)
      onDeleted?.()
    },
  })

  const handleStartChat = () => {
    navigate({ to: "/chat/$agentId", params: { agentId: agent.id } })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-w-0">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-5" />
            返回
          </button>
        ) : (
          <div />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors outline-none">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4 mr-2" />
              删除 Agent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Agent</DialogTitle>
            <DialogDescription>
              确定要删除 &ldquo;{agent.name}&rdquo; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-10 max-w-xl mx-auto w-full">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          {agent.avatar ? (
            <img
              src={agent.avatar}
              alt={agent.name}
              className="size-20 rounded-2xl bg-muted object-cover mb-4"
            />
          ) : (
            <div
              className={cn(
                "flex size-20 items-center justify-center rounded-2xl text-white text-3xl font-bold mb-4",
                getAvatarColor(agent.id),
              )}
            >
              {agent.name.charAt(0)}
            </div>
          )}
          <h2 className="text-xl font-bold text-foreground">{agent.name}</h2>
          {agent.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">{agent.description}</p>
          )}
          <Button
            onClick={handleStartChat}
            size="sm"
            className="mt-4"
          >
            <MessageCircle className="size-4 mr-1.5" />
            开始对话
          </Button>
        </div>

        {/* Video intro */}
        {agent.config?.video && <VideoSection url={agent.config.video} />}

        {/* Showcase — grouped by tag */}
        <ShowcaseSection agentId={agent.id} />
      </div>
      </div>
    </div>
  )
}

// ── Video Section ──

function VideoSection({ url }: { url: string }) {
  return (
    <div className="mb-8">
      <div className="overflow-hidden rounded-xl border border-border bg-black aspect-video">
        <video
          src={url}
          controls
          preload="metadata"
          className="w-full h-full object-contain"
          poster={`${url}#t=0.5`}
        />
      </div>
    </div>
  )
}

// ── Showcase Section (按 tag 分组) ──

function ShowcaseSection({ agentId }: { agentId: string }) {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ["chat-sessions", agentId],
    queryFn: () => getChatSessions(agentId),
  })
  const sessions = data?.sessions ?? []

  if (sessions.length === 0) return null

  // Group by tag
  const grouped = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const tag = s.tag || "其他"
    if (!grouped.has(tag)) grouped.set(tag, [])
    grouped.get(tag)!.push(s)
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([tag, tagSessions]) => (
        <div key={tag} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{tag}</h3>
          <div className="grid gap-2">
            {tagSessions.map((session) => (
              <button
                key={session.sessionId}
                onClick={() => navigate({
                  to: "/agents/$agentId/history",
                  params: { agentId },
                  search: { session: session.sessionId, title: session.title },
                })}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground line-clamp-1">{session.title}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">{session.messageCount} 条对话</span>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/30" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Installed Skills ──

function InstalledSkillsSection({ agentId }: { agentId: string }) {
  const { data } = useQuery({
    queryKey: ["agent-skills", agentId],
    queryFn: () => getAgentSkills(agentId),
  })
  const installedSkills = data?.skills ?? []

  if (installedSkills.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">已安装技能</h3>
        <p className="text-xs text-muted-foreground">暂无技能</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">已安装技能</h3>

      <div className="space-y-2">
        {installedSkills.map((skill) => (
          <SkillCard key={skill.name} skill={skill} agentId={agentId} />
        ))}
      </div>
    </div>
  )
}

function SkillCard({ skill, agentId }: { skill: { name: string; displayName: string; description: string; version: string }; agentId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Package className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{skill.displayName}</span>
            <span className="text-[10px] text-muted-foreground">v{skill.version}</span>
          </div>
          {skill.description && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{skill.description}</p>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
      </button>

      {/* Skill detail + credential config dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{skill.displayName}</DialogTitle>
            <DialogDescription>{skill.description}</DialogDescription>
          </DialogHeader>
          <SkillCredentialsForm agentId={agentId} skillName={skill.name} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function SkillCredentialsForm({ agentId, skillName }: { agentId: string; skillName: string }) {
  const queryClient = useQueryClient()
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const { data } = useQuery({
    queryKey: ["credentials", agentId],
    queryFn: () => getCredentials(agentId),
    select: (d) => d.credentials,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const creds: Record<string, string> = {}
      for (const [key, value] of Object.entries(formValues)) {
        if (value) creds[key] = value
      }
      return setCredentials(agentId, creds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", agentId] })
      setFormValues({})
      setDirty(false)
    },
  })

  const fields = data ?? []

  if (fields.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        该技能无需配置凭证
      </p>
    )
  }

  return (
    <div className="space-y-4 py-2">
      <h4 className="text-sm font-medium">凭证配置</h4>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-foreground">{field.name}</label>
              {field.hasValue && !formValues[field.name] && (
                <span className="text-[10px] text-emerald-600">已配置</span>
              )}
            </div>
            <Input
              type="password"
              value={formValues[field.name] ?? ""}
              onChange={(e) => {
                setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                setDirty(true)
              }}
              placeholder={field.hasValue ? "••••••（输入新值覆盖）" : "请输入"}
              className="h-9 text-sm font-mono"
            />
          </div>
        ))}
      </div>
      {dirty && (
        <Button
          size="sm"
          className="w-full"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "保存中..." : "保存"}
        </Button>
      )}
    </div>
  )
}

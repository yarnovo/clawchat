import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, MessageCircle, Key, Plus, X, Save, MoreVertical, Trash2 } from "lucide-react"
import { getCredentials, setCredentials, deleteAgent } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const statusConfig: Record<string, { color: string; label: string }> = {
  running: { color: "bg-emerald-500", label: "运行中" },
  starting: { color: "bg-amber-500", label: "启动中..." },
  stopped: { color: "bg-gray-400", label: "已停止" },
  error: { color: "bg-red-500", label: "异常" },
  created: { color: "bg-gray-400", label: "未启动" },
}

const SKILL_LABELS: Record<string, string> = {
  "code-review": "代码审查",
  debugging: "调试",
  refactoring: "重构",
  translation: "翻译",
  proofreading: "校对",
  "data-analysis": "数据分析",
  visualization: "可视化",
  copywriting: "文案写作",
  blog: "博客",
  "ui-review": "UI 审查",
  accessibility: "无障碍",
  docker: "Docker",
  "ci-cd": "CI/CD",
  monitoring: "监控",
}

export function AgentDetail({ agent, onBack, onDeleted }: AgentDetailProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { color, label } = statusConfig[agent.status] ?? statusConfig.created

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
    <div className="flex flex-1 flex-col overflow-y-auto">
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
              确定要删除 "{agent.name}" 吗？此操作不可撤销。
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

      <div className="flex flex-1 items-start justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header: Avatar + Name */}
        <div className="flex items-center gap-4">
          {agent.avatar ? (
            <img
              src={agent.avatar}
              alt={agent.name}
              className="size-16 shrink-0 rounded-xl bg-muted object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-xl text-white text-2xl font-semibold",
                getAvatarColor(agent.id),
              )}
            >
              {agent.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {agent.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              ID: {agent.id}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-border" />

        {/* Info rows */}
        <div className="space-y-3.5">
          <div className="flex items-center">
            <span className="w-16 shrink-0 text-sm text-muted-foreground">
              状态
            </span>
            <div className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", color)} />
              <span className="text-sm text-foreground">{label}</span>
            </div>
          </div>

          <div className="flex items-start">
            <span className="w-16 shrink-0 text-sm text-muted-foreground pt-0.5">
              简介
            </span>
            <span className="text-sm text-foreground">
              {agent.description}
            </span>
          </div>

          {agent.skills?.length > 0 && (
          <div className="flex items-start">
            <span className="w-16 shrink-0 text-sm text-muted-foreground pt-0.5">
              技能
            </span>
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {SKILL_LABELS[skill] ?? skill}
                </span>
              ))}
            </div>
          </div>
          )}

          {agent.resourceProfile && (
          <div className="flex items-center">
            <span className="w-16 shrink-0 text-sm text-muted-foreground">
              配置
            </span>
            <span className="text-sm text-foreground">
              {agent.resourceProfile}
            </span>
          </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-border" />

        {/* Action buttons */}
        <div className="flex justify-center gap-8">
          <button
            onClick={handleStartChat}
            className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors"
          >
            <div className="flex size-12 items-center justify-center rounded-full border border-border">
              <MessageCircle className="size-5" />
            </div>
            <span className="text-xs">发消息</span>
          </button>

        </div>

        {/* Divider */}
        <div className="my-5 border-t border-border" />

        {/* Credentials section */}
        <CredentialsSection agentId={agent.id} />
      </div>
      </div>
    </div>
  )
}

function CredentialsSection({ agentId }: { agentId: string }) {
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<{ key: string; value: string }[]>([])
  const [hasEdits, setHasEdits] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["credentials", agentId],
    queryFn: () => getCredentials(agentId),
    select: (d) => d.credentials,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const creds: Record<string, string> = {}
      for (const e of entries) {
        if (e.key.trim()) creds[e.key.trim()] = e.value
      }
      // Merge with existing keys that weren't edited
      if (data) {
        for (const existing of data) {
          if (!creds[existing.name] && existing.hasValue) {
            creds[existing.name] = '' // keep key, empty means unchanged on server
          }
        }
      }
      return setCredentials(agentId, creds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", agentId] })
      setEntries([])
      setHasEdits(false)
    },
  })

  const existingKeys = data ?? []

  const addEntry = () => {
    setEntries([...entries, { key: "", value: "" }])
    setHasEdits(true)
  }

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index))
    setHasEdits(entries.length > 1)
  }

  const updateEntry = (index: number, field: "key" | "value", val: string) => {
    const next = [...entries]
    next[index] = { ...next[index], [field]: val }
    setEntries(next)
    setHasEdits(true)
  }

  return (
    <div id="credentials-section" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">凭证配置</h3>
        <button
          onClick={addEntry}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          <Plus className="size-3.5" />
          添加
        </button>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">加载中...</p>
      )}

      {/* Existing keys */}
      {existingKeys.length > 0 && (
        <div className="space-y-1.5">
          {existingKeys.map((cred) => (
            <div key={cred.name} className="flex items-center gap-2 text-xs">
              <Key className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="font-mono text-foreground">{cred.name}</span>
              <span className="text-muted-foreground">
                {cred.hasValue ? "已配置" : "未配置"}
              </span>
            </div>
          ))}
        </div>
      )}

      {existingKeys.length === 0 && entries.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground">
          暂无凭证，点击"添加"配置 API Key
        </p>
      )}

      {/* New entries form */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={entry.key}
                onChange={(e) => updateEntry(i, "key", e.target.value)}
                placeholder="KEY_NAME"
                className="h-8 text-xs font-mono flex-1"
              />
              <Input
                value={entry.value}
                onChange={(e) => updateEntry(i, "value", e.target.value)}
                placeholder="值"
                type="password"
                className="h-8 text-xs flex-1"
              />
              <button
                onClick={() => removeEntry(i)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}

          <Button
            size="sm"
            className="w-full"
            disabled={saveMutation.isPending || !hasEdits}
            onClick={() => saveMutation.mutate()}
          >
            <Save className="size-3.5 mr-1.5" />
            {saveMutation.isPending ? "保存中..." : "保存凭证"}
          </Button>

          {saveMutation.isSuccess && (
            <p className="text-xs text-emerald-600">保存成功</p>
          )}
        </div>
      )}
    </div>
  )
}

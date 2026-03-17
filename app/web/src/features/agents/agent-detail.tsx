import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageCircle, MoreVertical, Trash2, ChevronRight } from "lucide-react"
import { deleteAgent, getChatSessions } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/zh-cn"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types"

dayjs.extend(relativeTime)
dayjs.locale("zh-cn")

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
      <PageHeader
        title={onBack ? agent.name : ""}
        onBack={onBack}
        actions={
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
        }
      />

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
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {session.messageCount} 条对话 · {dayjs(session.lastTimestamp).fromNow()}
                  </span>
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


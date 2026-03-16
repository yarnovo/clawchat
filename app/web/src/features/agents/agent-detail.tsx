import { useNavigate } from "@tanstack/react-router"
import { ChevronLeft, MessageCircle, Zap } from "lucide-react"
import { startConversation } from "@/services/api-client"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types"

interface AgentDetailProps {
  agent: Agent
  onBack?: () => void
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

export function AgentDetail({ agent, onBack }: AgentDetailProps) {
  const navigate = useNavigate()
  const { color, label } = statusConfig[agent.status] ?? statusConfig.created

  const handleStartChat = async () => {
    await startConversation(agent.id).catch(() => {})
    navigate({ to: "/chat/$agentId", params: { agentId: agent.id } })
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Mobile back button */}
      {onBack && (
        <div className="flex h-14 shrink-0 items-center border-b border-border px-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-5" />
            返回
          </button>
        </div>
      )}

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

          <button className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors">
            <div className="flex size-12 items-center justify-center rounded-full border border-border">
              <Zap className="size-5" />
            </div>
            <span className="text-xs">查看技能</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

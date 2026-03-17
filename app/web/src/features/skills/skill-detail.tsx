import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Download, File } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSkill, installSkill, listAgents } from "@/services/api-client"

interface SkillDetailProps {
  skillName: string
  onBack?: () => void
}

export function SkillDetail({ skillName, onBack }: SkillDetailProps) {
  const queryClient = useQueryClient()
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")

  const { data: skillData, isLoading } = useQuery({
    queryKey: ["skill", skillName],
    queryFn: () => getSkill(skillName),
  })

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: () => listAgents(),
  })

  const installMutation = useMutation({
    mutationFn: () => installSkill(skillName, selectedAgentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })

  const skill = skillData?.skill
  const agents = agentsData?.agents ?? []

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        技能不存在
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Mobile back */}
      {onBack && <PageHeader title="返回" onBack={onBack} />}

      <div className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold">{skill.displayName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {skill.name} · v{skill.version}
            </p>
          </div>

          {skill.description && (
            <p className="mt-3 text-sm text-foreground">{skill.description}</p>
          )}

          <div className="my-5 border-t border-border" />

          {/* Install to agent */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">安装到 Agent</h3>
            <div className="flex gap-2">
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="选择 Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="default"
                disabled={!selectedAgentId || installMutation.isPending}
                onClick={() => installMutation.mutate()}
              >
                <Download className="size-4 mr-1.5" />
                {installMutation.isPending ? "安装中..." : "安装"}
              </Button>
            </div>
            {installMutation.isSuccess && (
              <p className="text-xs text-emerald-600">安装成功</p>
            )}
            {installMutation.isError && (
              <p className="text-xs text-destructive">安装失败</p>
            )}
          </div>

          <div className="my-5 border-t border-border" />

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

          {/* SKILL.md content */}
          {skill.content && (
            <>
              <div className="my-5 border-t border-border" />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">说明文档</h3>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-muted rounded-lg p-4 overflow-x-auto">
                  {skill.content}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

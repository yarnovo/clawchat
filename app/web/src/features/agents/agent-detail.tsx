import { useState, useEffect, useRef } from "react"
import { useScrolled } from "@/hooks/use-scrolled"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageCircle, MoreVertical, Trash2, ChevronRight, Settings2, Plus } from "lucide-react"
import { deleteAgent, getChatSessions, getCredentials, setCredentials } from "@/services/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm, useFieldArray } from "react-hook-form"
import { validateEnvVarName, computeCanSave } from "@/lib/env-var"
import { PageHeader } from "@/components/ui/page-header"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/zh-cn"
import type { Agent } from "@/types"

dayjs.extend(relativeTime)
dayjs.locale("zh-cn")

interface AgentDetailProps {
  agent: Agent
  onBack?: () => void
  onDeleted?: () => void
}

export function AgentDetail({ agent, onBack, onDeleted }: AgentDetailProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [envOpen, setEnvOpen] = useState(false)

  const [scrollRef, scrolled] = useScrolled()

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
        scrolled={scrolled}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors outline-none">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEnvOpen(true)}>
                <Settings2 className="size-4 mr-2" />
                环境变量
              </DropdownMenuItem>
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

      {/* Env vars dialog */}
      <EnvVarsDialog agentId={agent.id} open={envOpen} onOpenChange={setEnvOpen} />

      <ScrollArea viewportRef={scrollRef} className="flex-1">
      <div className="px-6 py-10 max-w-xl mx-auto w-full">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src={agent.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(agent.name)}`}
            alt={agent.name}
            className="size-20 rounded-2xl bg-muted object-cover mb-4"
          />
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
      </ScrollArea>
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

// ── Env Vars Dialog ──

interface EnvFormValues {
  entries: {
    key: string
    value: string
    note: string
    noteOpen: boolean
    existing: boolean
  }[]
}

export function EnvVarsDialog({
  agentId,
  open,
  onOpenChange,
}: {
  agentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [initialKeys, setInitialKeys] = useState<Set<string>>(new Set())
  const [initialNotes, setInitialNotes] = useState<Record<string, string>>({})

  const form = useForm<EnvFormValues>({
    defaultValues: { entries: [{ key: "", value: "", note: "", noteOpen: false, existing: false }] },
    mode: "onChange",
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "entries" })
  const userOpenedNotes = useRef(new Set<number>())

  const { data, isSuccess } = useQuery({
    queryKey: ["credentials", agentId],
    queryFn: () => getCredentials(agentId),
    enabled: open,
  })

  // 加载已有凭证 → reset form
  useEffect(() => {
    if (!open || !data) return
    const notesMap: Record<string, string> = {}
    for (const c of data.credentials) {
      if (c.note) notesMap[c.name] = c.note
    }
    setInitialNotes(notesMap)
    const rows = data.credentials.map((c) => ({
      key: c.name, value: "", note: c.note || "", noteOpen: Boolean(c.note), existing: c.hasValue,
    }))
    setInitialKeys(new Set(data.credentials.filter(c => c.hasValue).map(c => c.name)))
    userOpenedNotes.current.clear()
    form.reset({ entries: rows.length > 0 ? rows : [{ key: "", value: "", note: "", noteOpen: false, existing: false }] })
  }, [open, data, form])

  const watchedEntries = form.watch("entries")
  const canSave = computeCanSave(
    watchedEntries.map(e => ({ key: e.key, value: e.value, existing: e.existing, note: e.note })),
    initialKeys,
    initialNotes,
  )

  const saveMutation = useMutation({
    mutationFn: async (values: EnvFormValues) => {
      const creds: Record<string, string | null> = {}
      const notes: Record<string, string> = {}
      for (const e of values.entries) {
        const k = e.key.trim()
        if (!k) continue
        if (e.value) {
          creds[k] = e.value
        } else if (e.existing) {
          creds[k] = null
        }
        if (e.note) notes[k] = e.note
      }
      return setCredentials(agentId, creds as Record<string, string>, notes)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", agentId] })
      onOpenChange(false)
    },
  })

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg" initialFocus={false}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>环境变量</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            设置注入容器的环境变量，Agent 启动时生效。
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} data-ready={isSuccess || undefined}>
          <div className="-mx-3">
            <div className="max-h-[60vh] overflow-y-auto px-3 py-0.5">
              {/* Column headers */}
              {fields.length > 0 && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-1 text-xs font-medium text-muted-foreground">Key</span>
                  <span className="flex-1 text-xs font-medium text-muted-foreground">Value</span>
                  <span className="w-8" />
                </div>
              )}

              <div className="space-y-4">
                {fields.map((field, i) => {
                  const existing = form.watch(`entries.${i}.existing`)
                  const noteOpen = form.watch(`entries.${i}.noteOpen`)
                  const keyError = form.formState.errors.entries?.[i]?.key
                  return (
                    <div key={field.id}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            placeholder="变量名..."
                            {...form.register(`entries.${i}.key`, {
                              validate: (v) => {
                                const trimmed = v.trim()
                                // 空行（key 和 value 都没填）不报错
                                if (!trimmed && !form.getValues(`entries.${i}.value`)) return true
                                return validateEnvVarName(trimmed) ?? true
                              },
                            })}
                            readOnly={existing}
                            aria-invalid={!!keyError}
                            className={`w-full font-mono text-sm${existing ? " bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                          />
                          {keyError && <p className="text-xs text-destructive mt-1">{keyError.message}</p>}
                        </div>
                        <Input
                          placeholder={existing ? "••••••••" : ""}
                          type="password"
                          value={form.watch(`entries.${i}.value`)}
                          onChange={(e) => {
                            form.setValue(`entries.${i}.value`, e.target.value)
                            form.setValue(`entries.${i}.existing`, false)
                          }}
                          className="flex-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="flex shrink-0 size-8 items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {noteOpen ? (
                        <NoteField register={form.register(`entries.${i}.note`)} autoFocus={userOpenedNotes.current.has(i)} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            userOpenedNotes.current.add(i)
                            form.setValue(`entries.${i}.noteOpen`, true)
                          }}
                          className="mt-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          添加备注
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ key: "", value: "", note: "", noteOpen: false, existing: false })}
            className="w-fit mt-4"
          >
            <Plus className="size-3.5 mr-1.5" />
            添加变量
          </Button>

          <ResponsiveDialogFooter className="mt-4">
            <Button type="submit" disabled={saveMutation.isPending || !canSave}>
              {saveMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// ── Note Field (展开时自动聚焦) ──

function NoteField({ register, autoFocus = false }: { register: ReturnType<ReturnType<typeof useForm>["register"]>; autoFocus?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { ref, ...rest } = register

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  return (
    <div className="mt-2 mr-11">
      <span className="text-xs font-medium text-muted-foreground mb-1 block">备注</span>
      <Textarea
        placeholder="例如：来自 Supabase 的数据库密钥..."
        ref={(el) => {
          ref(el)
          textareaRef.current = el
        }}
        {...rest}
        className="text-sm min-h-[60px]"
      />
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


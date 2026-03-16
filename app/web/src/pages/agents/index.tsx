import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Play, Square, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  listAgents,
  createAgent,
  startAgent,
  stopAgent,
  deleteAgent,
} from '@/services/api-client'
import type { Agent } from '@/types'

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500',
  starting: 'bg-amber-500',
  stopped: 'bg-gray-400',
  error: 'bg-red-500',
  created: 'bg-gray-400',
}

const statusLabels: Record<string, string> = {
  running: 'Running',
  starting: 'Starting...',
  stopped: 'Stopped',
  error: 'Error',
  created: 'Created',
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const navigate = useNavigate()

  const refresh = () => {
    listAgents()
      .then((data) => setAgents(data.agents))
      .catch(() => {})
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setNewName('')
    await createAgent({ name })
    refresh()
  }

  const handleStart = async (id: string) => {
    setLoading(id)
    try {
      await startAgent(id)
      refresh()
    } finally {
      setLoading(null)
    }
  }

  const handleStop = async (id: string) => {
    setLoading(id)
    try {
      await stopAgent(id)
      refresh()
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteAgent(id)
    refresh()
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-foreground mb-6">Agents</h1>

        {/* Create */}
        <div className="flex gap-2 mb-6">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New agent name..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="size-4 mr-1" />
            Create
          </Button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <Avatar>
                <AvatarFallback>
                  <Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
              <button
                className="flex-1 text-left min-w-0"
                onClick={() =>
                  navigate({
                    to: '/chat/$agentId',
                    params: { agentId: agent.id },
                  })
                }
              >
                <span className="text-sm font-medium block truncate">
                  {agent.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      statusColors[agent.status] ?? 'bg-gray-400',
                    )}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {statusLabels[agent.status] ?? agent.status}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-1">
                {agent.status === 'running' ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleStop(agent.id)}
                    disabled={loading === agent.id}
                  >
                    <Square className="size-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleStart(agent.id)}
                    disabled={loading === agent.id}
                  >
                    <Play className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(agent.id)}
                  disabled={loading === agent.id}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {agents.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No agents yet. Create one above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

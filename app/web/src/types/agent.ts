export interface Agent {
  id: string
  name: string
  description: string
  avatar?: string
  status: 'created' | 'starting' | 'running' | 'stopped' | 'error'
  channelUrl?: string
  currentSessionId: number
  resourceProfile?: string
  skills?: string[]
  category?: string
  lastMessage?: { content: string; timestamp: number }
  createdAt: string
}

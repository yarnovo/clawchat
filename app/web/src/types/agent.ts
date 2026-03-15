export interface Agent {
  id: string
  name: string
  description: string
  avatar?: string
  status: 'running' | 'stopped' | 'starting' | 'error'
  channelUrl: string
  skills: string[]
  createdAt: number
}

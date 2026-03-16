export interface Message {
  id: string
  agentId: string
  sessionId: number
  role: 'user' | 'assistant'
  content: string
  status: 'sending' | 'sent' | 'streaming' | 'complete' | 'error'
  requestId?: string
  timestamp: number
}

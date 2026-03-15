export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  status: 'sending' | 'sent' | 'streaming' | 'complete' | 'error'
  requestId?: string
  timestamp: number
}

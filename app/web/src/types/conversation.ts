export interface Conversation {
  id: string
  agentId: string
  title: string
  lastMessage?: string
  lastMessageAt?: number
  createdAt: number
}

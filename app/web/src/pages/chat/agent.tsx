import { useParams } from '@tanstack/react-router'
import { ChatPage } from '@/features/chat/chat-page'

export default function AgentChatPage() {
  const { agentId } = useParams({ strict: false }) as { agentId: string }
  return <ChatPage agentId={agentId} />
}

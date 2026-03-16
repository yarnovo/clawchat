import { useParams } from '@tanstack/react-router'
import { ChatPage } from '@/features/chat/chat-page'

export default function AgentChatPage() {
  const { agentId } = useParams({ from: '/chat/$agentId' })
  return <ChatPage agentId={agentId} />
}

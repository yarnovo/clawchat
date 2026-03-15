import { MessageSquare } from 'lucide-react'

interface EmptyStateProps {
  agentName?: string
}

export function EmptyState({ agentName }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <MessageSquare className="size-8 text-muted-foreground" />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">
          {agentName ? `Chat with ${agentName}` : 'Start a conversation'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {agentName
            ? `Send a message to begin chatting with ${agentName}.`
            : 'Select a conversation or start a new one.'}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {['Say hello', 'Ask a question', 'Get help'].map((suggestion) => (
          <span
            key={suggestion}
            className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
          >
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  )
}

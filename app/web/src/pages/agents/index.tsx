import { Store } from 'lucide-react'

export default function AgentsPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Store className="size-12 stroke-1" />
        <h2 className="text-lg font-medium text-foreground">
          Agent Marketplace
        </h2>
        <p className="text-sm">Browse and discover AI agents</p>
      </div>
    </div>
  )
}

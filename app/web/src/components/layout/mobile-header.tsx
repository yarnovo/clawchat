import { Menu, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileHeaderProps {
  onMenuClick: () => void
  currentAgentName?: string
  isOnline?: boolean
}

export function MobileHeader({
  onMenuClick,
  currentAgentName = "ClawChat",
  isOnline = true,
}: MobileHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
      <Button variant="ghost" size="icon-sm" onClick={onMenuClick}>
        <Menu className="size-5" />
      </Button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
          <Bot className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {currentAgentName}
          </h1>
          <div className="flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                isOnline ? "bg-green-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-[10px] text-muted-foreground">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

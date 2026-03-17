import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  onBack?: () => void
  status?: string
  children?: ReactNode
  actions?: ReactNode
  scrolled?: boolean
}

export function PageHeader({ title, onBack, status, children, actions, scrolled }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex h-14 shrink-0 items-center justify-between border-b px-4 transition-colors duration-200",
      scrolled ? "border-border" : "border-transparent",
    )}>
      <div className="flex min-w-0 flex-1 items-center">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
          >
            <ChevronLeft className="size-4 shrink-0" />
            <span className="truncate font-semibold text-foreground">{title}</span>
          </button>
        ) : title ? (
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
        ) : null}
        {status && (
          <p className="ml-2 shrink-0 text-[11px] text-muted-foreground">{status}</p>
        )}
        {children}
      </div>
      {actions && <div className="ml-4 flex shrink-0 items-center">{actions}</div>}
    </div>
  )
}

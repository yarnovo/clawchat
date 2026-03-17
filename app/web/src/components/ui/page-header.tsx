import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  onBack?: () => void
  children?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, onBack, children, actions }: PageHeaderProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
          >
            <ChevronLeft className="size-4" />
            <span className="font-semibold text-foreground">{title}</span>
          </button>
        ) : title ? (
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        ) : null}
        {children}
      </div>
      {actions && <div className="flex items-center">{actions}</div>}
    </div>
  )
}

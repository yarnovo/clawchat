export function SessionDivider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-muted-foreground">New Session</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

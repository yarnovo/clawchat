import { MessageCircle, Store, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

type Tab = "chat" | "agents"

interface TabBarProps {
  active: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; icon: typeof MessageCircle; label: string }[] = [
  { id: "chat", icon: MessageCircle, label: "Chat" },
  { id: "agents", icon: Store, label: "Agents" },
]

export function TabBar({ active, onTabChange }: TabBarProps) {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)

  return (
    <nav className="flex items-center justify-around border-t border-border bg-background px-2 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <tab.icon className="size-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        )
      })}
      <button
        onClick={() => setSettingsOpen(true)}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-muted-foreground transition-colors"
      >
        <Settings className="size-5" />
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </nav>
  )
}

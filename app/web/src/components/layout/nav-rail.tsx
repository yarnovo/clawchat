import {
  MessageCircle,
  Store,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

interface NavRailProps {
  activePage: "chat" | "agents"
  onNavigate: (page: "chat" | "agents") => void
}

const navItems = [
  { id: "chat" as const, icon: MessageCircle },
  { id: "agents" as const, icon: Store },
] as const

export function NavRail({ activePage, onNavigate }: NavRailProps) {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)

  return (
    <div className="flex h-full w-16 flex-col items-center bg-sidebar border-r border-sidebar-border py-4">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm mb-6">
        C
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-5" />
            </button>
          )
        })}
      </nav>

      <button
        onClick={() => setSettingsOpen(true)}
        className="cursor-pointer"
      >
        <Avatar size="sm">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </button>
    </div>
  )
}

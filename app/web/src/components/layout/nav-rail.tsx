import {
  MessageCircle,
  Store,
  Settings,
} from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"
import { useAgentStore } from "@/stores/agent-store"

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
  const agents = useAgentStore((s) => s.agents)
  const addAgent = useAgentStore((s) => s.addAgent)
  const navigate = useNavigate()

  const handleSelfChat = () => {
    // Add self to conversation list if not already there
    if (!agents.find((a) => a.id === "self")) {
      addAgent({
        id: "self",
        name: "自己",
        description: "给自己发消息",
        avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=self",
        status: "running",
        currentSessionId: 1,
        resourceProfile: "standard",
        skills: [],
        createdAt: new Date().toISOString(),
      })
    }
    // Navigate to chat tab then into self chat
    onNavigate("chat")
    navigate({ to: "/chat/$agentId", params: { agentId: "self" } })
  }

  return (
    <div className="flex h-full w-16 flex-col items-center bg-sidebar border-r border-sidebar-border py-4">
      {/* User avatar — click to start self chat */}
      <button
        onClick={handleSelfChat}
        className="mb-6 hover:opacity-90 transition-opacity"
      >
        <img
          src="https://api.dicebear.com/9.x/notionists/svg?seed=self"
          alt="me"
          className="size-10 rounded-lg bg-muted"
        />
      </button>

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
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-5" />
            </button>
          )
        })}
      </nav>

      {/* Settings */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      >
        <Settings className="size-5" />
      </button>
    </div>
  )
}

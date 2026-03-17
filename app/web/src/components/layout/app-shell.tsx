import { type ReactNode } from "react"
import { useNavigate, useMatchRoute } from "@tanstack/react-router"
import { useMediaQuery } from "@/hooks/use-media-query"
import { NavRail } from "@/components/layout/nav-rail"
import { ConversationList } from "@/components/layout/conversation-list"
import { TabBar } from "@/components/layout/tab-bar"
import { SettingsDialog } from "@/features/settings/settings-dialog"
import { SkillMarketplaceDialog } from "@/features/skills/skill-marketplace-dialog"
import { useUIStore } from "@/stores/ui-store"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const skillsOpen = useUIStore((s) => s.skillsOpen)
  const setSkillsOpen = useUIStore((s) => s.setSkillsOpen)

  const handleNavigate = (page: "chat" | "agents") => {
    if (page === "chat") navigate({ to: "/chat" })
    else navigate({ to: "/agents" })
  }

  const handleAgentSelect = (agentId: string) => {
    navigate({ to: "/chat/$agentId", params: { agentId } })
  }

  // Determine active route
  const chatMatch = matchRoute({ to: "/chat/$agentId", fuzzy: true })
  const activeAgentId =
    chatMatch && typeof chatMatch === "object" && "agentId" in chatMatch
      ? (chatMatch as { agentId: string }).agentId
      : undefined

  const isInChat = !!activeAgentId
  const isChatPage = !!matchRoute({ to: "/chat", fuzzy: true })
  const isAgentsPage = !!matchRoute({ to: "/agents", fuzzy: true })

  const activeTab: "chat" | "agents" = isAgentsPage ? "agents" : "chat"

  // Desktop
  if (isDesktop) {
    return (
      <div className="flex h-screen bg-background">
        <NavRail activePage={activeTab} onNavigate={handleNavigate} />
        {activeTab === "chat" && (
          <ConversationList
            activeAgentId={activeAgentId}
            onAgentSelect={handleAgentSelect}
            onNavigate={handleNavigate}
          />
        )}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
        <SettingsDialog />
        <SkillMarketplaceDialog open={skillsOpen} onOpenChange={setSkillsOpen} />
      </div>
    )
  }

  // Mobile: full-screen chat
  if (isInChat) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        <SettingsDialog />
        <SkillMarketplaceDialog open={skillsOpen} onOpenChange={setSkillsOpen} />
      </div>
    )
  }

  // Mobile: tab pages
  return (
    <div className="flex h-screen flex-col bg-background">
      <main className="flex-1 flex flex-col overflow-hidden">
        {isChatPage ? (
          <ConversationList
            activeAgentId={activeAgentId}
            onAgentSelect={handleAgentSelect}
            onNavigate={handleNavigate}
            className="w-full border-r-0"
          />
        ) : (
          children
        )}
      </main>
      <TabBar
        active={activeTab}
        onTabChange={(tab) => handleNavigate(tab)}
      />
      <SettingsDialog />
      <SkillMarketplaceDialog open={skillsOpen} onOpenChange={setSkillsOpen} />
    </div>
  )
}

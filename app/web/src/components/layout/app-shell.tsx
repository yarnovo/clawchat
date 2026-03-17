import { type ReactNode, useLayoutEffect, useState } from "react"
import { useNavigate, useMatchRoute } from "@tanstack/react-router"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { useBackNavigation, SwipeBackView } from "@/hooks/use-back-navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import { NavRail } from "@/components/layout/nav-rail"
import { ConversationList } from "@/components/layout/conversation-list"
import { AgentList } from "@/components/layout/agent-list"
import { TabBar } from "@/components/layout/tab-bar"
import { SettingsDialog } from "@/features/settings/settings-dialog"
import { SkillMarketplaceDialog } from "@/features/skills/skill-marketplace-dialog"
import { useUIStore } from "@/stores/ui-store"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  useBackNavigation()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const skillsOpen = useUIStore((s) => s.skillsOpen)
  const setSkillsOpen = useUIStore((s) => s.setSkillsOpen)

  const dragX = useMotionValue(window.innerWidth)
  const backdropOpacity = useTransform(dragX, [0, 300], [0.4, 0])

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

  const agentDetailMatch = matchRoute({ to: "/agents/$agentId", fuzzy: true })
  const selectedAgentDetailId =
    agentDetailMatch &&
    typeof agentDetailMatch === "object" &&
    "agentId" in agentDetailMatch
      ? (agentDetailMatch as { agentId: string }).agentId
      : undefined

  const isInChat = !!activeAgentId
  const isAgentDetail = !!agentDetailMatch
  const isFullScreen = isInChat || isAgentDetail
  const isAgentsPage = !!matchRoute({ to: "/agents", fuzzy: true })

  const activeTab: "chat" | "agents" = isAgentsPage ? "agents" : "chat"

  // 两阶段挂载：先设 dragX 到屏外，再渲染 overlay（同步二次渲染，paint 前完成）
  const [overlayReady, setOverlayReady] = useState(false)
  useLayoutEffect(() => {
    if (isFullScreen) {
      dragX.set(window.innerWidth)
      setOverlayReady(true)
    } else {
      setOverlayReady(false)
    }
  }, [isFullScreen, dragX])

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

  // Mobile: base layer (always mounted) + overlay (detail pages)
  const showOverlay = isFullScreen && overlayReady

  return (
    <div className="relative flex h-screen flex-col bg-background pt-[env(safe-area-inset-top)]">
      {/* Base layer: 始终挂载，用 hidden 切换 tab */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className={
            activeTab === "chat"
              ? "flex flex-1 flex-col overflow-hidden"
              : "hidden"
          }
        >
          <ConversationList
            activeAgentId={activeAgentId}
            onAgentSelect={handleAgentSelect}
            onNavigate={handleNavigate}
            className="w-full border-r-0"
          />
        </div>
        <div
          className={
            activeTab === "agents"
              ? "flex flex-1 flex-col overflow-hidden"
              : "hidden"
          }
        >
          <AgentList
            className="w-full border-r-0"
            selectedAgentId={selectedAgentDetailId}
            onAgentSelect={(id) =>
              navigate({ to: "/agents/$agentId", params: { agentId: id } })
            }
          />
        </div>
      </div>
      <TabBar active={activeTab} onTabChange={(tab) => handleNavigate(tab)} />

      {/* Overlay: dragX 确认在屏外后才进 DOM */}
      {showOverlay && (
        <div className="absolute inset-0 z-20 overflow-hidden">
          <motion.div
            style={{ opacity: backdropOpacity }}
            className="absolute inset-0 bg-black pointer-events-none"
          />
          <SwipeBackView
            dragX={dragX}
            className="flex h-full flex-col overflow-hidden pt-[env(safe-area-inset-top)]"
          >
            {children}
          </SwipeBackView>
        </div>
      )}

      <SettingsDialog />
      <SkillMarketplaceDialog open={skillsOpen} onOpenChange={setSkillsOpen} />
    </div>
  )
}

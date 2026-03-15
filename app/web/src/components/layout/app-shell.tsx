import { useState, type ReactNode } from "react"
import { useNavigate, useMatchRoute } from "@tanstack/react-router"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useUIStore } from "@/stores/ui-store"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()

  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  const handleNavigate = (page: "agents" | "settings") => {
    navigate({ to: `/${page}` })
    setSheetOpen(false)
  }

  const handleConversationSelect = (id: string) => {
    navigate({ to: "/chat/$conversationId", params: { conversationId: id } })
    setSheetOpen(false)
  }

  // Determine active conversation from route
  const chatMatch = matchRoute({ to: "/chat/$conversationId", fuzzy: true })
  const activeConversationId =
    chatMatch && typeof chatMatch === "object" && "conversationId" in chatMatch
      ? (chatMatch as { conversationId: string }).conversationId
      : undefined

  if (isDesktop) {
    return (
      <div className="flex h-screen bg-background">
        {sidebarOpen && (
          <Sidebar
            activeConversationId={activeConversationId}
            onNavigate={handleNavigate}
            onConversationSelect={handleConversationSelect}
          />
        )}
        <main className="flex-1 flex flex-col overflow-hidden border-l border-border">
          {children}
        </main>
      </div>
    )
  }

  // Mobile layout
  return (
    <div className="flex h-screen flex-col bg-background">
      <MobileHeader onMenuClick={() => setSheetOpen(true)} />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            activeConversationId={activeConversationId}
            onNavigate={handleNavigate}
            onConversationSelect={handleConversationSelect}
          />
        </SheetContent>
      </Sheet>
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}

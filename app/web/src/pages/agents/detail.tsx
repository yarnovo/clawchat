import { useLayoutEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Outlet, useParams, useNavigate, useMatchRoute } from "@tanstack/react-router"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { AgentDetail } from "@/features/agents/agent-detail"
import { SwipeBackView, useAnimatedBack } from "@/hooks/use-back-navigation"
import { getAgent } from "@/services/api-client"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function AgentDetailPage() {
  const { agentId } = useParams({ strict: false }) as { agentId: string }
  const navigate = useNavigate()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const matchRoute = useMatchRoute()
  const hasHistory = !!matchRoute({ to: "/agents/$agentId/history", fuzzy: true })
  const animatedBack = useAnimatedBack()

  const dragX = useMotionValue(window.innerWidth)
  const backdropOpacity = useTransform(dragX, [0, 300], [0.4, 0])

  // 两阶段挂载：先设 dragX 到屏外，再渲染 overlay
  const [historyReady, setHistoryReady] = useState(false)
  useLayoutEffect(() => {
    if (hasHistory) {
      dragX.set(window.innerWidth)
      setHistoryReady(true)
    } else {
      setHistoryReady(false)
    }
  }, [hasHistory, dragX])

  const { data } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
  })

  const agent = data?.agent
  if (!agent) return null

  // Desktop: history replaces detail
  if (isDesktop) {
    return hasHistory ? <Outlet /> : (
      <AgentDetail
        agent={agent}
        onDeleted={() => navigate({ to: "/agents" })}
      />
    )
  }

  // Mobile: detail always mounted, history overlays on top
  const showHistory = hasHistory && historyReady

  return (
    <div className="relative flex flex-1 flex-col min-w-0 overflow-hidden">
      <AgentDetail
        agent={agent}
        onBack={animatedBack}
        onDeleted={() => navigate({ to: "/agents" })}
      />
      {showHistory && (
        <div className="absolute inset-0 z-20 overflow-hidden">
          <motion.div
            style={{ opacity: backdropOpacity }}
            className="absolute inset-0 bg-black pointer-events-none"
          />
          <SwipeBackView
            dragX={dragX}
            className="flex h-full flex-col overflow-hidden"
          >
            <Outlet />
          </SwipeBackView>
        </div>
      )}
    </div>
  )
}

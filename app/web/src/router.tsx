import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/app-shell'
import { useTheme } from '@/hooks/use-theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// Root layout
const rootRoute = createRootRoute({
  component: function RootLayout() {
    // Initialize theme (applies dark class to <html>)
    useTheme()

    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </TooltipProvider>
      </QueryClientProvider>
    )
  },
})

// Index route — redirect to /chat
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/chat' })
  },
})

// Chat routes
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  component: lazyRouteComponent(() => import('./pages/chat')),
})

const conversationRoute = createRoute({
  getParentRoute: () => chatRoute,
  path: '/$conversationId',
  component: lazyRouteComponent(() => import('./pages/chat/conversation')),
})

// Agents route (lazy)
const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agents',
  component: lazyRouteComponent(() => import('./pages/agents')),
})

// Settings route (lazy)
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('./pages/settings')),
})

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  chatRoute.addChildren([conversationRoute]),
  agentsRoute,
  settingsRoute,
])

// Create and export router
export const router = createRouter({ routeTree })

// Type safety for router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { queryClient }

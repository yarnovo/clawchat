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
import { LoginPage } from '@/features/auth/login-page'
import { RegisterPage } from '@/features/auth/register-page'
import { useTheme } from '@/hooks/use-theme'
import { getMe } from '@/services/api-client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: false,
    },
  },
})

/** Check auth by calling /api/auth/me — returns true if cookie is valid */
async function checkAuth(): Promise<boolean> {
  try {
    await getMe()
    return true
  } catch {
    return false
  }
}

// Root layout
const rootRoute = createRootRoute({
  component: function RootLayout() {
    useTheme()
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </QueryClientProvider>
    )
  },
})

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: async () => {
    if (await checkAuth()) throw redirect({ to: '/chat' })
  },
})

// Register route
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
  beforeLoad: async () => {
    if (await checkAuth()) throw redirect({ to: '/chat' })
  },
})

// Authenticated layout
const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: function AuthLayout() {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    )
  },
  beforeLoad: async () => {
    if (!(await checkAuth())) throw redirect({ to: '/login' })
  },
})

// Index route
const indexRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/chat' })
  },
})

// Chat routes
const chatRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/chat',
  component: lazyRouteComponent(() => import('./pages/chat')),
})

const agentChatRoute = createRoute({
  getParentRoute: () => chatRoute,
  path: '/$agentId',
  component: lazyRouteComponent(() => import('./pages/chat/agent')),
})

// Agents routes
const agentsRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/agents',
  component: lazyRouteComponent(() => import('./pages/agents')),
})

const agentDetailRoute = createRoute({
  getParentRoute: () => agentsRoute,
  path: '/$agentId',
  component: lazyRouteComponent(() => import('./pages/agents/detail')),
})

const agentHistoryRoute = createRoute({
  getParentRoute: () => agentsRoute,
  path: '/$agentId/history',
  component: lazyRouteComponent(() => import('./pages/agents/history')),
})

// Build route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  authLayout.addChildren([
    indexRoute,
    chatRoute.addChildren([agentChatRoute]),
    agentsRoute.addChildren([agentHistoryRoute, agentDetailRoute]),
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { queryClient }

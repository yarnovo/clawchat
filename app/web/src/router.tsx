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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function isLoggedIn() {
  return localStorage.getItem('loggedIn') === 'true'
}

// Root layout — just providers + theme
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
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: '/chat' })
  },
})

// Register route
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: '/chat' })
  },
})

// Authenticated layout — wraps all protected routes
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
  beforeLoad: () => {
    if (!isLoggedIn()) throw redirect({ to: '/login' })
  },
})

// Index route — redirect to /chat
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

// Agents route
const agentsRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/agents',
  component: lazyRouteComponent(() => import('./pages/agents')),
  validateSearch: (search: Record<string, unknown>) => ({
    focus: (search.focus as string) || undefined,
  }),
})

// Build route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  authLayout.addChildren([
    indexRoute,
    chatRoute.addChildren([agentChatRoute]),
    agentsRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { queryClient }

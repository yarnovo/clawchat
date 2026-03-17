import { cleanup, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let mockIsDesktop = false
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => mockIsDesktop,
}))

let mockMatchResults: Record<string, unknown> = {}
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useMatchRoute: () => (opts: { to: string }) => mockMatchResults[opts.to],
}))

vi.mock('@/stores/ui-store', () => ({
  useUIStore: () => false,
}))

vi.mock('@/components/layout/nav-rail', () => ({
  NavRail: () => null,
}))
vi.mock('@/components/layout/conversation-list', () => ({
  ConversationList: () => <div data-testid="conversation-list" />,
}))
vi.mock('@/components/layout/tab-bar', () => ({
  TabBar: ({ active }: { active: string }) => (
    <nav data-testid="tab-bar" data-active={active}>
      <span>Chat</span>
      <span>Agents</span>
      <span>Settings</span>
    </nav>
  ),
}))
vi.mock('@/features/settings/settings-dialog', () => ({
  SettingsDialog: () => null,
}))
vi.mock('@/features/skills/skill-marketplace-dialog', () => ({
  SkillMarketplaceDialog: () => null,
}))

import { AppShell } from '../app-shell'

function setRoute(route: string) {
  mockMatchResults = {}

  if (route.startsWith('/chat/')) {
    const agentId = route.replace('/chat/', '')
    mockMatchResults['/chat/$agentId'] = { agentId }
    mockMatchResults['/chat'] = true
  } else if (route === '/chat') {
    mockMatchResults['/chat'] = true
  }

  if (route.match(/^\/agents\/[^/]+/)) {
    const agentId = route.split('/')[2]
    mockMatchResults['/agents/$agentId'] = { agentId }
    mockMatchResults['/agents'] = true
  } else if (route === '/agents') {
    mockMatchResults['/agents'] = true
  }
}

beforeEach(() => {
  mockIsDesktop = false
})

afterEach(() => {
  cleanup()
})

describe('AppShell TabBar visibility on mobile', () => {
  it('shows TabBar on /chat (conversation list)', () => {
    setRoute('/chat')
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument()
  })

  it('shows TabBar on /agents (agent list)', () => {
    setRoute('/agents')
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument()
  })

  it('hides TabBar on /chat/:agentId (full-screen chat)', () => {
    setRoute('/chat/agent-123')
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.queryByTestId('tab-bar')).not.toBeInTheDocument()
  })

  it('hides TabBar on /agents/:agentId (agent detail)', () => {
    setRoute('/agents/agent-123')
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.queryByTestId('tab-bar')).not.toBeInTheDocument()
  })

  it('hides TabBar on /agents/:agentId/history (agent history)', () => {
    setRoute('/agents/agent-123/history')
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.queryByTestId('tab-bar')).not.toBeInTheDocument()
  })
})

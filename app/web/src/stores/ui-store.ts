import { create } from 'zustand'
import { router } from '@/router'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  sidebarOpen: boolean
  theme: Theme
  settingsOpen: boolean
  isLoggedIn: boolean

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  setSettingsOpen: (open: boolean) => void
  login: () => void
  logout: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  settingsOpen: false,
  isLoggedIn: localStorage.getItem('loggedIn') === 'true',
  theme: (localStorage.getItem('theme') as Theme) ?? 'system',

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  login: () => {
    localStorage.setItem('loggedIn', 'true')
    set({ isLoggedIn: true })
    router.navigate({ to: '/chat' })
  },

  logout: () => {
    localStorage.removeItem('loggedIn')
    set({ isLoggedIn: false, settingsOpen: false })
    router.navigate({ to: '/login' })
  },
}))

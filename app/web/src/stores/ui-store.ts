import { create } from 'zustand'
import { apiLogout } from '@/services/api-client'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  sidebarOpen: boolean
  theme: Theme
  settingsOpen: boolean

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  setSettingsOpen: (open: boolean) => void
  logout: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  settingsOpen: false,
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

  logout: async () => {
    await apiLogout().catch(() => {})
    set({ settingsOpen: false })
    window.location.href = '/login'
  },
}))

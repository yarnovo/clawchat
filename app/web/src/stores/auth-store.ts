import { create } from 'zustand'

interface AuthState {
  userId: string | null
  name: string | null
  defaultAgentId: string | null

  setUser: (user: { id: string; name: string; defaultAgentId: string | null }) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  name: null,
  defaultAgentId: null,

  setUser: (user) =>
    set({ userId: user.id, name: user.name, defaultAgentId: user.defaultAgentId }),

  clear: () =>
    set({ userId: null, name: null, defaultAgentId: null }),
}))

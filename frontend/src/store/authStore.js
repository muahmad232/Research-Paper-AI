import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      agentSecret: '',

      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setAgentSecret: (secret) => set({ agentSecret: secret }),
    }),
    {
      name: 'research-agent-auth',
    }
  )
)

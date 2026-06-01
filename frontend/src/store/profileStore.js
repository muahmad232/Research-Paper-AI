import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useProfileStore = create(
  persist(
    (set, get) => ({
      profile: null,
      agentSecret: '',
      
      setProfile: (profile) => set({ profile }),
      setAgentSecret: (secret) => set({ agentSecret: secret }),
      
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'research-agent-profile',
    }
  )
)

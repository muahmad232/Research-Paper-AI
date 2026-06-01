import { Bell, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { digestApi, agentApi } from '../../api'
import { useProfileStore } from '../../store/profileStore'
import toast from 'react-hot-toast'

export default function Header({ title, subtitle }) {
  const { agentSecret } = useProfileStore()
  const queryClient = useQueryClient()

  const { data: agentStatus } = useQuery({
    queryKey: ['agent-status'],
    queryFn: agentApi.status,
    refetchInterval: 30000,
  })

  const { mutate: triggerAgent, isPending } = useMutation({
    mutationFn: () => agentApi.trigger(agentSecret),
    onSuccess: () => {
      toast.success('🤖 Agent pipeline started!', {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(99,102,241,0.3)' },
      })
      setTimeout(() => queryClient.invalidateQueries(), 5000)
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`, {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(239,68,68,0.3)' },
      })
    },
  })

  const lastRun = agentStatus?.runs?.[0]
  const isRunning = lastRun?.status === 'running'

  return (
    <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Agent Status */}
        {lastRun && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700 border border-white/5">
            <div className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-brand-400 animate-pulse' :
              lastRun.status === 'completed' ? 'bg-emerald-400' : 'bg-rose-400'
            }`} />
            <span className="text-xs text-gray-400">
              {isRunning ? 'Agent running...' :
               lastRun.status === 'completed' ? `Last run: ${lastRun.papers_fetched} papers` :
               'Last run failed'}
            </span>
          </div>
        )}

        {/* Run Agent */}
        <button
          onClick={() => triggerAgent()}
          disabled={isPending || isRunning || !agentSecret}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          title={!agentSecret ? 'Set agent secret in Settings first' : ''}
        >
          <RefreshCw size={14} className={isPending || isRunning ? 'animate-spin' : ''} />
          Run Agent
        </button>

        <button className="w-9 h-9 rounded-xl bg-surface-700 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}

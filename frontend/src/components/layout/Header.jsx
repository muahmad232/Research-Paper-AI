import { useState, useRef } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Header({ title, subtitle }) {
  const { agentSecret } = useAuthStore()
  const queryClient = useQueryClient()
  const pollingRef = useRef(null)

  const { data: agentStatus } = useQuery({
    queryKey: ['agent-status'],
    queryFn: agentApi.status,
    refetchInterval: (data) => (data?.runs?.[0]?.status === 'running' ? 2000 : 30000),
  })

  const { mutate: triggerAgent, isPending } = useMutation({
    mutationFn: () => agentApi.trigger(agentSecret),
    onSuccess: () => {
      toast.success('🤖 Agent pipeline started!', {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(99,102,241,0.3)' },
      })

      // Poll for completion every 8 seconds, stop when done/failed
      let attempts = 0
      pollingRef.current = setInterval(async () => {
        attempts++
        try {
          const status = await agentApi.status()
          const latest = status?.runs?.[0]
          if (latest?.status === 'completed' || latest?.status === 'failed') {
            clearInterval(pollingRef.current)
            queryClient.invalidateQueries()
            if (latest.status === 'completed') {
              toast.success(`✅ Agent finished — ${latest.papers_fetched} papers fetched`, {
                style: { background: '#1e1e35', color: '#fff' },
              })
            } else {
              toast.error('Agent run failed. Check server logs.', {
                style: { background: '#1e1e35', color: '#fff' },
              })
            }
          }
        } catch {
          // ignore polling errors
        }
        if (attempts > 60) clearInterval(pollingRef.current) // max 8 minutes
      }, 8000)
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`, {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(239,68,68,0.3)' },
      })
    },
  })

  const lastRun = agentStatus?.runs?.[0]
  const isRunning = lastRun?.status === 'running' || isPending

  // Parse last log line for real-time progress text
  const logString = lastRun?.log || ''
  const lastLogLine = logString.split('\n').filter(Boolean).pop()
  const displayLog = lastLogLine ? (lastLogLine.substring(0, 40) + (lastLogLine.length > 40 ? '...' : '')) : 'Initializing pipeline...'

  return (
    <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Agent Status Pill with Progress */}
        {lastRun && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700 border border-white/5 relative overflow-hidden group">
            {isRunning && (
              <div className="absolute inset-0 bg-brand-500/10 animate-pulse" />
            )}
            
            <div className="relative flex items-center gap-2">
              {isRunning ? (
                <Loader2 size={13} className="text-brand-400 animate-spin" />
              ) : lastRun.status === 'completed' ? (
                <CheckCircle2 size={13} className="text-emerald-400" />
              ) : (
                <XCircle size={13} className="text-rose-400" />
              )}
              
              <span className="text-xs text-gray-400 font-medium">
                {isRunning
                  ? displayLog
                  : lastRun.status === 'completed'
                  ? `Last: ${lastRun.papers_fetched ?? 0} papers`
                  : 'Last run failed'}
              </span>
            </div>
            
            {/* Hover tooltip for full log */}
            {isRunning && lastLogLine && (
               <div className="absolute top-full right-0 mt-2 p-2 bg-gray-900 border border-white/10 rounded-lg text-[10px] text-gray-300 w-64 whitespace-pre-wrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl pointer-events-none">
                 {lastLogLine}
               </div>
            )}
          </div>
        )}

        {/* Run Agent Button */}
        <button
          onClick={() => triggerAgent()}
          disabled={isRunning || !agentSecret}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          title={!agentSecret ? 'Set agent secret in Settings first' : isRunning ? 'Agent is already running' : ''}
        >
          <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
          {isRunning ? 'Running...' : 'Run Agent'}
        </button>
      </div>
    </header>
  )
}

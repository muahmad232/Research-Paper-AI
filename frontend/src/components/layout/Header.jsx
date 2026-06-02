import { useState, useRef, useEffect } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentApi } from '../../api'
import toast from 'react-hot-toast'

// Pipeline step labels — must match orchestrator.py PIPELINE_STEPS order
const STEP_LABELS = [
  'Loading profiles',
  'Fetching papers',
  'Generating embeddings',
  'Scoring papers',
  'Analyzing papers',
  'Finding research gaps',
  'Flagging escalations',
  'Generating digest',
  'Done',
]
const TOTAL_STEPS = STEP_LABELS.length

function parseStepFromLog(log) {
  if (!log) return null
  const matches = [...log.matchAll(/\[STEP:(\d+)\/(\d+)\]/g)]
  if (!matches.length) return null
  const last = matches[matches.length - 1]
  const stepNum = parseInt(last[1], 10)
  const total   = parseInt(last[2], 10)
  return {
    stepNum,
    total,
    stepLabel: STEP_LABELS[stepNum - 1] ?? `Step ${stepNum}`,
    progress: Math.round((stepNum / total) * 100),
  }
}

export default function Header({ title, subtitle }) {
  const queryClient = useQueryClient()
  const pollingRef  = useRef(null)
  const [expanded, setExpanded]       = useState(false)
  const [justFinished, setJustFinished] = useState(false)
  // Track whether WE started this run (so we own the polling/refresh cycle)
  const [isOurRun, setIsOurRun] = useState(false)

  // ── Agent status query ─────────────────────────────────────────────────────
  // NOTE: React Query v5 changed refetchInterval — the callback receives a Query
  // object, not data. We drive polling manually via setInterval instead.
  const { data: agentStatus } = useQuery({
    queryKey: ['agent-status'],
    queryFn: agentApi.status,
    // Always refetch every 3s while we own an active run; 30s otherwise
    refetchInterval: isOurRun ? 3000 : 30000,
  })

  const { mutate: triggerAgent, isPending } = useMutation({
    mutationFn: () => agentApi.trigger(),
    onSuccess: () => {
      setIsOurRun(true)
      setExpanded(true)
      setJustFinished(false)
      toast.success('🤖 Agent pipeline started!', {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(99,102,241,0.3)' },
      })

      // Force an immediate fetch so the running state appears right away
      queryClient.refetchQueries({ queryKey: ['agent-status'] })
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`, {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(239,68,68,0.3)' },
      })
    },
  })

  // ── Watch for completion and refresh all page data ─────────────────────────
  const prevStatus = useRef(null)
  useEffect(() => {
    const status = agentStatus?.runs?.[0]?.status
    if (!isOurRun) return

    if (status === 'completed' || status === 'failed') {
      // Only fire once per transition (running → done)
      if (prevStatus.current === 'running' || prevStatus.current === null) {
        setIsOurRun(false)
        setJustFinished(true)

        // Immediately refresh ALL page data — papers, digest, gaps, escalations
        queryClient.refetchQueries()

        if (status === 'completed') {
          const n = agentStatus.runs[0].papers_fetched ?? 0
          toast.success(`✅ Pipeline complete — ${n} papers fetched`, {
            style: { background: '#1e1e35', color: '#fff' },
          })
          setTimeout(() => {
            setExpanded(false)
            setJustFinished(false)
          }, 5000)
        } else {
          toast.error('Agent run failed. Check server logs.', {
            style: { background: '#1e1e35', color: '#fff' },
          })
        }
      }
    }
    prevStatus.current = status ?? null
  }, [agentStatus, isOurRun, queryClient])

  // Cleanup on unmount
  useEffect(() => () => clearInterval(pollingRef.current), [])

  const lastRun   = agentStatus?.runs?.[0]
  const isRunning = lastRun?.status === 'running' || isPending
  const isFailed  = lastRun?.status === 'failed' && !isRunning

  const stepInfo  = parseStepFromLog(lastRun?.log || '')
  const progress  = isRunning ? (stepInfo?.progress ?? 5) : (justFinished ? 100 : 0)
  const stepLabel = stepInfo?.stepLabel ?? 'Initializing…'

  const showPanel = isRunning || justFinished

  return (
    <header className="border-b border-white/5">
      {/* Main header row */}
      <div className="px-8 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Compact status pill when panel is hidden */}
          {lastRun && !showPanel && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700 border border-white/5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              {isFailed
                ? <XCircle size={12} className="text-rose-400" />
                : <CheckCircle2 size={12} className="text-emerald-400" />}
              {isFailed
                ? 'Last run failed'
                : `Last: ${lastRun.papers_fetched ?? 0} papers`}
            </button>
          )}

          {/* Run button */}
          <button
            id="run-agent-btn"
            onClick={() => triggerAgent()}
            disabled={isRunning}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            title={isRunning ? 'Pipeline is already running' : 'Run agent pipeline'}
          >
            <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
            {isRunning ? 'Running…' : 'Run Agent'}
          </button>
        </div>
      </div>

      {/* ── Progress Panel ─────────────────────────────────────────────────── */}
      {showPanel && (
        <div
          className="mx-8 mb-4 rounded-2xl overflow-hidden border"
          style={{
            background: 'rgba(30, 30, 53, 0.6)',
            borderColor: isRunning
              ? 'rgba(99,102,241,0.25)'
              : justFinished
              ? 'rgba(52,211,153,0.25)'
              : 'rgba(239,68,68,0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Progress bar track */}
          <div className="w-full h-1 bg-white/5">
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: justFinished
                  ? 'linear-gradient(90deg, #34d399, #10b981)'
                  : 'linear-gradient(90deg, #6366f1, #818cf8)',
                boxShadow: isRunning ? '0 0 12px rgba(99,102,241,0.6)' : 'none',
              }}
            />
          </div>

          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between gap-4">
              {/* Left: icon + step name */}
              <div className="flex items-center gap-2.5 min-w-0">
                {isRunning
                  ? <Loader2 size={14} className="text-brand-400 animate-spin shrink-0" />
                  : justFinished
                  ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  : <XCircle size={14} className="text-rose-400 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {isRunning
                      ? stepLabel
                      : justFinished
                      ? `Pipeline complete — ${lastRun?.papers_fetched ?? 0} papers fetched`
                      : 'Pipeline failed'}
                  </p>
                  {isRunning && stepInfo && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Step {stepInfo.stepNum} of {stepInfo.total}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: dots + % + collapse toggle */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-1">
                  {STEP_LABELS.map((_, i) => {
                    const n      = i + 1
                    const done   = stepInfo ? n < stepInfo.stepNum : justFinished
                    const active = stepInfo ? n === stepInfo.stepNum : false
                    return (
                      <div
                        key={n}
                        title={STEP_LABELS[i]}
                        className="rounded-full transition-all duration-300"
                        style={{
                          width:  active ? 20 : 6,
                          height: 6,
                          background: done
                            ? (justFinished ? '#34d399' : '#6366f1')
                            : active
                            ? '#818cf8'
                            : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    )
                  })}
                </div>

                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: justFinished ? '#34d399' : '#818cf8' }}
                >
                  {progress}%
                </span>

                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Expanded log lines */}
            {expanded && lastRun?.log && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {lastRun.log
                    .split('\n')
                    .filter(Boolean)
                    .map((line, i) => {
                      const isStep = line.startsWith('[STEP:')
                      return (
                        <p
                          key={i}
                          className="text-xs font-mono"
                          style={{ color: isStep ? '#a5b4fc' : '#6b7280' }}
                        >
                          {line}
                        </p>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

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
  const pollingRef      = useRef(null)
  const hasSeenRunning  = useRef(false)    // true once we observe 'running' for the current trigger
  const [expanded, setExpanded]         = useState(false)
  const [justFinished, setJustFinished] = useState(false)
  const [isOurRun, setIsOurRun]         = useState(false)

  // ── Agent status query ─────────────────────────────────────────────────────
  const { data: agentStatus } = useQuery({
    queryKey: ['agent-status'],
    queryFn: agentApi.status,
    refetchInterval: isOurRun ? 3000 : 30000,
  })

  const { mutate: triggerAgent, isPending } = useMutation({
    mutationFn: () => agentApi.trigger(),
    onSuccess: () => {
      setIsOurRun(true)
      hasSeenRunning.current = false
      setExpanded(true)
      setJustFinished(false)
      toast.success('Agent pipeline started', {
        style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
      })
      queryClient.refetchQueries({ queryKey: ['agent-status'] })
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`, {
        style: { background: '#ffffff', color: '#1F2937', border: '1px solid #FCA5A5' },
      })
    },
  })

  // ── Watch for completion ───────────────────────────────────────────────────
  const DASHBOARD_KEYS = [
    ['papers', 'highly_relevant'],
    ['digest-latest'],
    ['escalations'],
    ['gaps'],
  ]

  useEffect(() => {
    const status = agentStatus?.runs?.[0]?.status
    if (!isOurRun) return

    if (status === 'running') {
      hasSeenRunning.current = true
      return
    }

    if (!hasSeenRunning.current) return

    if (status === 'completed' || status === 'failed') {
      hasSeenRunning.current = false
      setIsOurRun(false)
      setJustFinished(true)

      DASHBOARD_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: key }))

      setTimeout(() => {
        DASHBOARD_KEYS.forEach(key => queryClient.refetchQueries({ queryKey: key }))
      }, 2000)

      if (status === 'completed') {
        const n = agentStatus.runs[0].papers_fetched ?? 0
        toast.success(`Pipeline complete — ${n} papers fetched`, {
          style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
        })
        setTimeout(() => {
          setExpanded(false)
          setJustFinished(false)
        }, 5000)
      } else {
        toast.error('Agent run failed. Check server logs.', {
          style: { background: '#ffffff', color: '#1F2937', border: '1px solid #FCA5A5' },
        })
      }
    }
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
    <header className="bg-white border-b border-gray-200">
      {/* Main header row */}
      <div className="px-8 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Compact status pill when panel is hidden */}
          {lastRun && !showPanel && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              {isFailed
                ? <XCircle size={12} className="text-red-500" />
                : <CheckCircle2 size={12} className="text-emerald-600" />}
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
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="mx-8 mb-4 rounded-xl overflow-hidden border"
          style={{
            background: '#FFFFFF',
            borderColor: isRunning
              ? '#BFDBFE'
              : justFinished
              ? '#BBF7D0'
              : '#FCA5A5',
          }}
        >
          {/* Progress bar track */}
          <div className="w-full h-1 bg-gray-100">
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: justFinished
                  ? '#16a34a'
                  : '#1E3A5F',
              }}
            />
          </div>

          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between gap-4">
              {/* Left: icon + step name */}
              <div className="flex items-center gap-2.5 min-w-0">
                {isRunning
                  ? <Loader2 size={14} className="text-brand-600 animate-spin shrink-0" />
                  : justFinished
                  ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  : <XCircle size={14} className="text-red-500 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
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
                            ? (justFinished ? '#16a34a' : '#1E3A5F')
                            : active
                            ? '#3B82F6'
                            : '#E5E7EB',
                        }}
                      />
                    )
                  })}
                </div>

                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: justFinished ? '#16a34a' : '#1E3A5F' }}
                >
                  {progress}%
                </span>

                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Expanded log lines */}
            {expanded && lastRun?.log && (
              <div className="mt-3 pt-3 border-t border-gray-100">
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
                          style={{ color: isStep ? '#1E3A5F' : '#9CA3AF' }}
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

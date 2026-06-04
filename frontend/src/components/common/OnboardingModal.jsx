import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ChevronRight, ChevronLeft, Brain, Settings,
  Zap, FileText, TrendingUp, AlertTriangle, BookOpen, CheckCircle2
} from 'lucide-react'

const STORAGE_KEY      = 'paperagent-onboarding-done'
const SLIDE_KEY        = 'paperagent-onboarding-slide'

const SLIDES = [
  {
    icon: Brain,
    color: '#818cf8',
    bg: 'linear-gradient(135deg,#6366f1,#818cf8)',
    title: 'Welcome to PaperAgent 👋',
    body: 'This quick guide will walk you through what the app does and how to get the most out of it. It only takes 60 seconds.',
    tip: null,
  },
  {
    icon: Settings,
    color: '#34d399',
    bg: 'linear-gradient(135deg,#10b981,#34d399)',
    title: 'Step 1 — Set up your Profile',
    body: 'Everything starts in Settings. Add your research interests (e.g. "federated learning", "LLM alignment"), keywords to match, and topics you want to exclude.',
    tip: '👉 Go to Settings → fill in Research Interests and Keywords before running the agent.',
    action: { label: 'Open Settings', route: '/settings' },
  },
  {
    icon: Zap,
    color: '#a78bfa',
    bg: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
    title: 'Step 2 — Run the Agent',
    body: 'Click "Run Agent" in the top bar. The pipeline fetches papers from arXiv and OpenAlex, embeds them, scores them against your profile using four signals (semantic similarity, LLM relevance, keywords, recency), and produces a ranked list.',
    tip: '⏱ It takes ~2–3 minutes. The progress bar shows you exactly which step is running.',
  },
  {
    icon: FileText,
    color: '#38bdf8',
    bg: 'linear-gradient(135deg,#0284c7,#38bdf8)',
    title: 'Papers — Your Ranked Feed',
    body: 'The Papers page shows all scored recommendations filtered by relevance category. Click any card to see the full abstract and the LLM\'s structured analysis (problem, method, dataset, results, limitations).',
    tip: '🟢 Highly Relevant (≥68) · 🟡 Potentially Relevant (≥38) · ⬜ Not Relevant',
  },
  {
    icon: AlertTriangle,
    color: '#fbbf24',
    bg: 'linear-gradient(135deg,#d97706,#fbbf24)',
    title: 'Escalations — Your Review Queue',
    body: 'When the agent is uncertain (conflicting signals, or score in the 50–70 ambiguous zone), it flags the paper for your judgment. You accept or reject with one click.',
    tip: '💡 Reviewing escalations improves how well the scoring reflects your taste over time.',
  },
  {
    icon: BookOpen,
    color: '#c084fc',
    bg: 'linear-gradient(135deg,#9333ea,#c084fc)',
    title: 'Research Gaps — Trend Radar',
    body: 'After every run the agent analyses your highly-relevant corpus and surfaces research gaps, emerging trends, and hot topics — giving you a strategic view of what\'s under-explored in your field.',
    tip: null,
  },
  {
    icon: TrendingUp,
    color: '#f472b6',
    bg: 'linear-gradient(135deg,#db2777,#f472b6)',
    title: 'Daily Digest — Morning Briefing',
    body: 'The Dashboard shows an AI-written daily digest summarising today\'s key findings, paper counts by category, and your top recommendations at a glance.',
    tip: '🕖 The scheduled job runs at 7 AM UTC automatically — or trigger it manually any time.',
  },
  {
    icon: CheckCircle2,
    color: '#34d399',
    bg: 'linear-gradient(135deg,#059669,#34d399)',
    title: "You're all set! 🎉",
    body: 'Head to Settings to fill in your research profile, then hit Run Agent. Your first results will be ready in a few minutes.',
    tip: null,
    action: { label: 'Go to Settings', route: '/settings' },
  },
]

export default function OnboardingModal() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // Restore slide position if user previously navigated away mid-tour
  const [slide, setSlide] = useState(
    () => parseInt(localStorage.getItem(SLIDE_KEY) || '0', 10)
  )

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  // Persist slide position whenever it changes (so navigating away and back resumes here)
  useEffect(() => {
    localStorage.setItem(SLIDE_KEY, String(slide))
  }, [slide])

  // Permanently dismiss — marks tour as done, clears saved slide
  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    localStorage.removeItem(SLIDE_KEY)
    setOpen(false)
  }

  // Temporary close for navigation buttons — does NOT mark tour as done
  // Advances to the next slide so returning from Settings shows the next step
  function navigateAway(route) {
    const nextSlide = Math.min(slide + 1, SLIDES.length - 1)
    localStorage.setItem(SLIDE_KEY, String(nextSlide))
    setSlide(nextSlide)
    setOpen(false)
    navigate(route)
  }

  if (!open) return null

  const current = SLIDES[slide]
  const isFirst = slide === 0
  const isLast  = slide === SLIDES.length - 1
  const Icon    = current.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(18,18,35,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Coloured header strip */}
        <div className="relative h-36 flex items-center justify-center overflow-hidden"
          style={{ background: current.bg }}>
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 30% 50%,rgba(255,255,255,0.12),transparent 60%)' }} />
          <div className="relative w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
            <Icon size={32} className="text-white" />
          </div>
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-white mb-3">{current.title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">{current.body}</p>

          {current.tip && (
            <div className="rounded-xl p-3.5 mb-4 text-xs text-gray-300 leading-relaxed"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              {current.tip}
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 my-6">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width:  i === slide ? 20 : 6,
                  height: 6,
                  background: i === slide
                    ? current.color
                    : i < slide
                    ? 'rgba(99,102,241,0.5)'
                    : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={() => setSlide(s => s - 1)}
                className="btn-secondary flex-shrink-0"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}

            {current.action ? (
              <button
                onClick={() => navigateAway(current.action.route)}
                className="btn-primary flex-1 justify-center"
                style={{ background: current.bg }}
              >
                {current.action.label} <ChevronRight size={14} />
              </button>
            ) : isLast ? (
              <button
                onClick={dismiss}
                className="btn-primary flex-1 justify-center"
                style={{ background: 'linear-gradient(135deg,#059669,#34d399)' }}
              >
                Let's go! <CheckCircle2 size={14} />
              </button>
            ) : (
              <button
                onClick={() => setSlide(s => s + 1)}
                className="btn-primary flex-1 justify-center"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>

          <button
            onClick={dismiss}
            className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors mt-4"
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  )
}

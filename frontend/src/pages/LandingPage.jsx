import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  Brain, Zap, Shield, TrendingUp, BookOpen, AlertTriangle,
  ArrowRight, Sparkles, FileText, Search, BarChart3
} from 'lucide-react'

const FEATURES = [
  {
    icon: Search,
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.12)',
    title: 'Smart Discovery',
    desc: 'LLM-generated search queries fetch papers from arXiv and OpenAlex tailored to your exact research profile.',
  },
  {
    icon: BarChart3,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    title: '4-Signal Scoring',
    desc: 'Every paper is scored on semantic similarity, LLM relevance judgment, keyword matching, and publication recency.',
  },
  {
    icon: Brain,
    color: '#c084fc',
    bg: 'rgba(192,132,252,0.12)',
    title: 'Deep Analysis',
    desc: 'Highly relevant papers are automatically parsed for problem, method, dataset, results, and limitations.',
  },
  {
    icon: TrendingUp,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    title: 'Gap Detection',
    desc: 'The agent identifies research gaps, emerging trends, and hot topics across your weekly paper corpus.',
  },
  {
    icon: AlertTriangle,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    title: 'Smart Escalation',
    desc: 'Papers with conflicting signals are flagged for your review — accept or reject with one click.',
  },
  {
    icon: Zap,
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.12)',
    title: 'Daily Digest',
    desc: 'A personalised AI-written briefing lands on your dashboard every morning summarising what was found.',
  },
]

const STEPS = [
  { n: '01', label: 'Set up your profile', desc: 'Add research interests, keywords, and topics to exclude.' },
  { n: '02', label: 'Run the agent', desc: 'Hit "Run Agent" or let the 7 AM cron do it automatically.' },
  { n: '03', label: 'Review your papers', desc: 'Browse scored recommendations, read deep analyses, decide on escalations.' },
]

export default function LandingPage() {
  const token = useAuthStore((s) => s.token)

  // Already logged in → go straight to dashboard
  if (token) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5"
        style={{ background: 'rgba(13,13,26,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa)' }}>
              <Brain size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">PaperAgent</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link to="/register"
              className="btn-primary text-sm">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-40 pb-28 px-6 text-center relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute top-32 right-1/4 w-72 h-72 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle,#a78bfa,transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 border"
            style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            <Sparkles size={11} />
            Powered by Groq · arXiv · OpenAlex
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6 text-balance">
            Your autonomous{' '}
            <span className="gradient-text">research paper</span>{' '}
            scout
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            PaperAgent discovers, screens, and analyses research papers daily — so you spend
            your time reading what matters, not searching for it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register"
              className="btn-primary px-6 py-3 text-base glow-brand">
              Start for free <ArrowRight size={16} />
            </Link>
            <Link to="/login"
              className="btn-secondary px-6 py-3 text-base">
              Sign in
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { val: '2 sources', label: 'arXiv + OpenAlex' },
              { val: '4 signals', label: 'Per-paper scoring' },
              { val: '7 AM', label: 'Daily auto-run' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold gradient-text">{s.val}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Everything automated</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From fetching to analysis to digest — the full pipeline runs without you lifting a finger.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="glass rounded-2xl p-6 hover:border-white/10 transition-all duration-300 group"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: f.bg }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Up and running in minutes</h2>
            <p className="text-gray-400">Three steps, then it runs itself.</p>
          </div>

          <div className="space-y-5">
            {STEPS.map((step, i) => (
              <div key={step.n} className="glass rounded-2xl p-6 flex items-start gap-5"
                style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                <span className="text-3xl font-extrabold shrink-0 gradient-text leading-none">{step.n}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{step.label}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 relative overflow-hidden"
            style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 0%,rgba(99,102,241,0.08),transparent 70%)' }} />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 glow-brand"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa)' }}>
                <FileText size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Stop searching. Start reading.
              </h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Create a free account, set your research profile, and let the agent handle discovery.
              </p>
              <Link to="/register" className="btn-primary px-8 py-3 text-base glow-brand">
                Create free account <ArrowRight size={16} />
              </Link>
              <p className="text-xs text-gray-500 mt-4">No credit card needed · Guest mode available</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-xs text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain size={12} className="text-brand-400" />
          <span className="font-semibold text-gray-400">PaperAgent</span>
        </div>
        Built with FastAPI · React · Supabase · Groq
      </footer>
    </div>
  )
}

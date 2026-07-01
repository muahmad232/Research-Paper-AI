import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  Brain, Zap, Shield, TrendingUp, BookOpen, AlertTriangle,
  ArrowRight, Search, FileText, BarChart3
} from 'lucide-react'

const FEATURES = [
  {
    icon: Search,
    color: '#2563EB',
    bg: '#EFF6FF',
    title: 'Smart Discovery',
    desc: 'LLM-generated search queries fetch papers from arXiv and OpenAlex tailored to your exact research profile.',
  },
  {
    icon: BarChart3,
    color: '#16a34a',
    bg: '#F0FDF4',
    title: '4-Signal Scoring',
    desc: 'Every paper is scored on semantic similarity, LLM relevance judgment, keyword matching, and publication recency.',
  },
  {
    icon: Brain,
    color: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Deep Analysis',
    desc: 'Highly relevant papers are automatically parsed for problem, method, dataset, results, and limitations.',
  },
  {
    icon: TrendingUp,
    color: '#0284C7',
    bg: '#F0F9FF',
    title: 'Gap Detection',
    desc: 'The agent identifies research gaps, emerging trends, and hot topics across your weekly paper corpus.',
  },
  {
    icon: AlertTriangle,
    color: '#D97706',
    bg: '#FFFBEB',
    title: 'Smart Escalation',
    desc: 'Papers with conflicting signals are flagged for your review — accept or reject with one click.',
  },
  {
    icon: Zap,
    color: '#DB2777',
    bg: '#FDF2F8',
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
    <div className="min-h-screen bg-white" style={{ fontFamily: '"IBM Plex Sans", Inter, sans-serif' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BookOpen size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">PaperAgent</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">
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
      <section className="pt-40 pb-28 px-6 text-center bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 bg-brand-50 border border-brand-200 text-brand-600">
            <Search size={11} />
            arXiv · OpenAlex · Groq · Sentence Transformers
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6 text-balance tracking-tight">
            Your autonomous{' '}
            <span style={{ color: '#1E3A5F' }}>research paper</span>{' '}
            scout
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            PaperAgent discovers, screens, and analyses research papers daily — so you spend
            your time reading what matters, not searching for it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register"
              className="btn-primary px-6 py-3 text-base">
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
              { val: '7 AM',     label: 'Daily auto-run' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-brand-600">{s.val}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Everything automated</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From fetching to analysis to digest — the full pipeline runs without you lifting a finger.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 group">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: f.bg }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-200">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Up and running in minutes</h2>
            <p className="text-gray-500">Three steps, then it runs itself.</p>
          </div>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={step.n}
                className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-5 hover:border-brand-200 transition-colors">
                <span className="text-3xl font-bold shrink-0 leading-none" style={{ color: '#1E3A5F' }}>{step.n}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{step.label}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-brand-600">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6 bg-white/15">
            <FileText size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            Stop searching. Start reading.
          </h2>
          <p className="text-blue-200 mb-8 leading-relaxed">
            Create a free account, set your research profile, and let the agent handle discovery.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold bg-white text-brand-600 hover:bg-gray-50 transition-colors">
            Create free account <ArrowRight size={16} />
          </Link>
          <p className="text-xs text-blue-300 mt-4">No credit card needed · Guest mode available</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-8 px-6 text-center text-xs text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookOpen size={12} className="text-brand-600" />
          <span className="font-semibold text-gray-700">PaperAgent</span>
        </div>
        Built with FastAPI · React · Supabase · Groq
      </footer>
    </div>
  )
}

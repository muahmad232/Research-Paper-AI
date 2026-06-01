import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Lightbulb,
  AlertTriangle,
  Settings,
  Bot,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/papers', icon: FileText, label: 'Papers' },
  { to: '/gaps', icon: Lightbulb, label: 'Research Gaps' },
  { to: '/escalations', icon: AlertTriangle, label: 'Escalations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col glass border-r border-white/5">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center glow-brand">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">PaperAgent</h1>
            <p className="text-xs text-gray-500">AI Screening System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* AI Badge */}
      <div className="p-4">
        <div className="glass rounded-xl p-3 border border-brand-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-brand-400" />
            <span className="text-xs font-semibold text-brand-300">Powered by AI</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Groq Llama3 + Sentence Transformers + LangChain
          </p>
        </div>
      </div>
    </aside>
  )
}

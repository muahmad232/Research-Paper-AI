import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Lightbulb, AlertTriangle,
  Settings, Bot, LogOut, User,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/papers', icon: FileText, label: 'Papers' },
  { to: '/gaps', icon: Lightbulb, label: 'Research Gaps' },
  { to: '/escalations', icon: AlertTriangle, label: 'Escalations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    queryClient.clear()
    navigate('/login')
    toast('Signed out', {
      icon: '👋',
      style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
    })
  }

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

      {/* User section */}
      <div className="p-4 border-t border-white/5">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/30 flex items-center justify-center shrink-0">
              <User size={14} className="text-brand-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Researcher'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}

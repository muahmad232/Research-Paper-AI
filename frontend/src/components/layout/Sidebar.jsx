import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Lightbulb, AlertTriangle,
  Settings, BookOpen, LogOut, User,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
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
      style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
    })
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
            <BookOpen size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight">PaperAgent</h1>
            <p className="text-xs text-gray-500">Research Screening</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
              <User size={14} className="text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'Researcher'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}

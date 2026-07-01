import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => authApi.login({ email: form.email, password: form.password }),
    onSuccess: (data) => {
      login(data.user, data.token)
      toast.success(`Welcome back, ${data.user.name}!`, {
        style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
      })
      navigate('/dashboard')
    },
  })

  const { mutate: guestMutate, isPending: isGuestPending } = useMutation({
    mutationFn: () => authApi.guestLogin(),
    onSuccess: (data) => {
      login(data.user, data.token)
      toast.success('Logged in as Guest', {
        style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
      })
      navigate('/dashboard')
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to login as guest')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return
    mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mb-4">
            <BookOpen size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">PaperAgent</h1>
          <p className="text-sm text-gray-500 mt-1">Research Paper Screening</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@university.edu"
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Your password"
                  className="input-field pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error.message}
              </div>
            )}

            {/* Submit */}
            <div className="space-y-3 pt-1">
              <button
                id="login-submit"
                type="submit"
                disabled={isPending || isGuestPending || !form.email || !form.password}
                className="btn-primary w-full justify-center py-2.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn size={16} />
                {isPending ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-gray-400 uppercase">or</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                type="button"
                onClick={() => guestMutate()}
                disabled={isPending || isGuestPending}
                className="btn-secondary w-full justify-center py-2.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGuestPending ? 'Generating session...' : 'Continue as Guest'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Footer badge */}
        <div className="mt-5 text-center text-xs text-gray-400">
          Powered by Groq Llama3 · Sentence Transformers
        </div>
      </div>
    </div>
  )
}

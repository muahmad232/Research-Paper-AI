import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bot, Mail, Lock, User, UserPlus, Eye, EyeOff, Sparkles, CheckCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const requirements = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p) || /[0-9]/.test(p), label: 'Contains a number or uppercase letter' },
]

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)

  const passwordsMatch = form.password && form.confirm && form.password === form.confirm
  const passwordValid = requirements.every(r => r.test(form.password))

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => authApi.register({ name: form.name, email: form.email, password: form.password }),
    onSuccess: (data) => {
      login(data.user, data.token)
      toast.success(`Account created! Welcome, ${data.user.name} 🎉`, {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(99,102,241,0.3)' },
        duration: 4000,
      })
      navigate('/dashboard')
    },
  })

  const { mutate: guestMutate, isPending: isGuestPending } = useMutation({
    mutationFn: () => authApi.guestLogin(),
    onSuccess: (data) => {
      login(data.user, data.token)
      toast.success('Logged in as Guest', {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(99,102,241,0.3)' },
      })
      navigate('/dashboard')
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to login as guest')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!passwordValid || !passwordsMatch) return
    mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center glow-brand mb-4">
            <Bot size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PaperAgent</h1>
          <p className="text-sm text-gray-500 mt-1">AI Research Paper Screening</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 border border-white/8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Create an account</h2>
            <p className="text-sm text-gray-500 mt-1">Start screening research papers with AI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="register-name"
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. Jane Smith"
                  className="input-field pl-10"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="register-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@university.edu"
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="register-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Create a password"
                  className="input-field pl-10 pr-10"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password requirements */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  {requirements.map((req, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-xs transition-colors ${req.test(form.password) ? 'text-emerald-400' : 'text-gray-600'}`}>
                      <CheckCircle size={11} />
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="register-confirm"
                  type={showPw ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat your password"
                  className={`input-field pl-10 ${form.confirm && !passwordsMatch ? 'border-rose-500/50 focus:border-rose-500' : form.confirm && passwordsMatch ? 'border-emerald-500/50 focus:border-emerald-500' : ''}`}
                  required
                  autoComplete="new-password"
                />
              </div>
              {form.confirm && !passwordsMatch && (
                <p className="text-xs text-rose-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm text-rose-400">
                {error.message}
              </div>
            )}

            {/* Submit */}
            <div className="space-y-3">
              <button
                id="register-submit"
                type="submit"
                disabled={isPending || isGuestPending || !form.name || !form.email || !passwordValid || !passwordsMatch}
                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <UserPlus size={16} />
                {isPending ? 'Creating account...' : 'Create Account'}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-gray-500 uppercase">or</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={() => guestMutate()}
                disabled={isPending || isGuestPending}
                className="btn-secondary w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGuestPending ? 'Generating session...' : 'Continue as Guest'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600">
          <Sparkles size={11} className="text-brand-500" />
          <span>Your data is private and scoped to your account</span>
        </div>
      </div>
    </div>
  )
}

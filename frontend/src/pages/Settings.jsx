import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Save, Settings as SettingsIcon, User, LogOut } from 'lucide-react'
import Header from '../components/layout/Header'
import { profileApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function TagInput({ label, values = [], onChange, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
      setInput('')
    }
  }
  const remove = (v) => onChange(values.filter(x => x !== v))
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map(v => (
          <span key={v} className="chip gap-1">
            {v}
            <button onClick={() => remove(v)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="input-field flex-1"
        />
        <button onClick={add} className="btn-secondary px-3"><Plus size={14} /></button>
      </div>
    </div>
  )
}

export default function Settings() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [form, setForm] = useState({
    research_interests: [],
    keywords: [],
    preferred_domains: [],
    preferred_venues: [],
    excluded_topics: [],
  })

  // FIX: Single query, sync form with useEffect when data arrives
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  useEffect(() => {
    if (profile) {
      setForm({
        research_interests: profile.research_interests || [],
        keywords: profile.keywords || [],
        preferred_domains: profile.preferred_domains || [],
        preferred_venues: profile.preferred_venues || [],
        excluded_topics: profile.excluded_topics || [],
      })
    }
  }, [profile])

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () => profileApi.upsert(form),
    onSuccess: () => {
      toast.success('Profile saved!', {
        style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const handleLogout = () => {
    logout()
    queryClient.clear()
    navigate('/login')
    toast('Signed out', {
      icon: '👋',
      style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
    })
  }

  const update = (field) => (values) => setForm(f => ({ ...f, [field]: values }))

  return (
    <>
      <Header title="Settings" subtitle="Configure your research profile and agent preferences" />
      <div className="p-8 max-w-2xl space-y-6 animate-fade-in">

        {/* Account Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-brand-600" />
            <h3 className="text-base font-semibold text-gray-900">Account</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-all"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Research Profile */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} className="text-brand-600" />
            <h3 className="text-base font-semibold text-gray-900">Research Profile</h3>
            {isLoading && <span className="text-xs text-gray-400 ml-auto">Loading...</span>}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">💡 How to build a great profile</h4>
            <ul className="text-xs text-blue-700 space-y-1.5 list-disc pl-4">
              <li><strong className="text-blue-900">Research Interests</strong> are used for semantic matching. Write full descriptive sentences (e.g. <i>"I am researching efficient fine-tuning techniques for LLMs"</i>).</li>
              <li><strong className="text-blue-900">Keywords</strong> are used for exact string matching. Use highly specific acronyms and jargon (e.g. <i>"LoRA", "RAG", "Transformers"</i>).</li>
            </ul>
          </div>

          <TagInput label="Research Interests" values={form.research_interests} onChange={update('research_interests')}
            placeholder="e.g. I am researching how to use retrieval-augmented generation in medical imaging..." />
          <TagInput label="Keywords" values={form.keywords} onChange={update('keywords')}
            placeholder="e.g. RAG, RLHF, Zero-shot, ViT, LoRA..." />
          <TagInput label="Preferred Domains" values={form.preferred_domains} onChange={update('preferred_domains')}
            placeholder="e.g. NLP, Healthcare, Finance..." />
          <TagInput label="Preferred Venues" values={form.preferred_venues} onChange={update('preferred_venues')}
            placeholder="e.g. NeurIPS, ACL, ICLR..." />
          <TagInput label="Excluded Topics" values={form.excluded_topics} onChange={update('excluded_topics')}
            placeholder="e.g. Computer Vision, Robotics..." />
          <button onClick={() => saveProfile()} disabled={isPending} className="btn-primary w-full justify-center">
            <Save size={14} />
            {isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

      </div>
    </>
  )
}

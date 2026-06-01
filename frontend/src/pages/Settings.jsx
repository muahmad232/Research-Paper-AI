import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Save, Key, Settings as SettingsIcon } from 'lucide-react'
import Header from '../components/layout/Header'
import { profileApi } from '../api'
import { useProfileStore } from '../store/profileStore'
import toast from 'react-hot-toast'

function TagInput({ label, values, onChange, placeholder }) {
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
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map(v => (
          <span key={v} className="chip gap-1">
            {v}
            <button onClick={() => remove(v)} className="hover:text-rose-400 transition-colors"><X size={10} /></button>
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
  const { agentSecret, setAgentSecret } = useProfileStore()

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: profileApi.get })

  const [form, setForm] = useState({
    research_interests: profile?.research_interests || [],
    keywords: profile?.keywords || [],
    preferred_domains: profile?.preferred_domains || [],
    preferred_venues: profile?.preferred_venues || [],
    excluded_topics: profile?.excluded_topics || [],
  })

  const { data: existingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    onSuccess: (data) => {
      if (data) setForm({
        research_interests: data.research_interests || [],
        keywords: data.keywords || [],
        preferred_domains: data.preferred_domains || [],
        preferred_venues: data.preferred_venues || [],
        excluded_topics: data.excluded_topics || [],
      })
    },
  })

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () => existingProfile ? profileApi.update(form) : profileApi.create(form),
    onSuccess: () => {
      toast.success('Profile saved!', { style: { background: '#1e1e35', color: '#fff' } })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const update = (field) => (values) => setForm(f => ({ ...f, [field]: values }))

  return (
    <>
      <Header title="Settings" subtitle="Configure your research profile and agent preferences" />
      <div className="p-8 max-w-2xl space-y-8 animate-fade-in">

        {/* Research Profile */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <SettingsIcon size={16} className="text-brand-400" />
            <h3 className="text-base font-bold text-white">Research Profile</h3>
          </div>
          <TagInput label="Research Interests" values={form.research_interests} onChange={update('research_interests')}
            placeholder="e.g. LLM Agents, Healthcare AI..." />
          <TagInput label="Keywords" values={form.keywords} onChange={update('keywords')}
            placeholder="e.g. RAG, hallucination, transformer..." />
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

        {/* Agent Secret */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">Agent Secret</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Required to manually trigger the agent from the dashboard. Must match <code className="text-brand-400 bg-surface-700 px-1 py-0.5 rounded text-[10px]">DAILY_AGENT_SECRET</code> in your backend .env file.
          </p>
          <input
            type="password"
            value={agentSecret}
            onChange={e => setAgentSecret(e.target.value)}
            placeholder="Enter your agent secret..."
            className="input-field"
          />
          <p className="text-[10px] text-gray-600 mt-2">Stored locally in your browser only.</p>
        </div>
      </div>
    </>
  )
}

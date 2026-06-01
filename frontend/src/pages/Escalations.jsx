import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, XCircle, ExternalLink, Users, Calendar } from 'lucide-react'
import Header from '../components/layout/Header'
import { ScoreBar } from '../components/papers/ScoreBar'
import { LoadingSkeleton, EmptyState } from '../components/common'
import { escalationsApi } from '../api'
import toast from 'react-hot-toast'

function EscalationCard({ esc, onDecide }) {
  const paper = esc.papers || {}
  return (
    <div className="glass rounded-2xl p-6 animate-slide-in space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-escalated"><AlertTriangle size={10} /> Needs Review</span>
            <span className="text-xs text-gray-500">Score: {Math.round(esc.final_score ?? 0)}/100</span>
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug">{paper.title}</h3>
        </div>
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-2.5 py-2 shrink-0">
            <ExternalLink size={13} />
          </a>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{paper.abstract}</p>
      <div className="flex gap-4 text-xs text-gray-600">
        {paper.authors?.length > 0 && (
          <div className="flex items-center gap-1"><Users size={11} />{paper.authors.slice(0, 2).join(', ')}</div>
        )}
        {paper.published_at && (
          <div className="flex items-center gap-1"><Calendar size={11} />{paper.published_at}</div>
        )}
      </div>
      <div className="glass rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-400">Why escalated?</p>
        <ScoreBar score={esc.semantic_score ?? 0} label="Semantic Similarity" />
        <ScoreBar score={esc.keyword_score ?? 0} label="Keyword Match" />
        <ScoreBar score={esc.final_score ?? 0} label="Final Score" />
        <p className="text-[10px] text-gray-600 pt-1">
          {(esc.semantic_score ?? 0) >= 70 && (esc.keyword_score ?? 0) <= 30
            ? '⚠ High semantic similarity but low keyword match — conflicting signals'
            : '⚠ Score in uncertain range (50–70) — needs human judgment'}
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => onDecide(esc.id, 'accept')}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all">
          <CheckCircle size={15} /> Accept
        </button>
        <button onClick={() => onDecide(esc.id, 'reject')}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 transition-all">
          <XCircle size={15} /> Reject
        </button>
      </div>
    </div>
  )
}

export default function Escalations() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['escalations'], queryFn: escalationsApi.list })
  const { mutate: decide } = useMutation({
    mutationFn: ({ id, decision }) => escalationsApi.decide(id, decision),
    onSuccess: (_, { decision }) => {
      toast.success(`Paper ${decision === 'accept' ? 'accepted ✓' : 'rejected ✗'}`, {
        style: { background: '#1e1e35', color: '#fff', border: '1px solid rgba(99,102,241,0.3)' },
      })
      queryClient.invalidateQueries({ queryKey: ['escalations'] })
    },
  })
  const escalations = data?.escalations || []
  return (
    <>
      <Header title="Escalation Queue" subtitle={`${escalations.length} paper${escalations.length !== 1 ? 's' : ''} awaiting review`} />
      <div className="p-8 animate-fade-in">
        {isLoading ? <LoadingSkeleton count={3} /> : escalations.length === 0 ? (
          <EmptyState icon={CheckCircle} title="Queue is clear!" description="No papers need your review. The agent is handling everything autonomously." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {escalations.map(esc => (
              <EscalationCard key={esc.id} esc={esc} onDecide={(id, decision) => decide({ id, decision })} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

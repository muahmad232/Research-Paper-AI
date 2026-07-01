import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ExternalLink, BookOpen, Cpu, Database, BarChart3, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { ScoreBar } from './ScoreBar'
import { papersApi } from '../../api'
import toast from 'react-hot-toast'

export default function PaperDetail({ rec, onClose }) {
  const queryClient = useQueryClient()

  if (!rec) return null
  const paper = rec.papers || rec
  const analysis = rec.analysis || {}
  const explanation = rec.explanation || {}

  const analysisFields = [
    { key: 'problem',      icon: BookOpen,    label: 'Problem Addressed', color: 'text-sky-700' },
    { key: 'method',       icon: Cpu,         label: 'Proposed Method',   color: 'text-violet-700' },
    { key: 'dataset',      icon: Database,    label: 'Dataset Used',      color: 'text-emerald-700' },
    { key: 'results',      icon: BarChart3,   label: 'Key Results',       color: 'text-amber-700' },
    { key: 'limitations',  icon: AlertCircle, label: 'Limitations',       color: 'text-red-700' },
    { key: 'future_work',  icon: ArrowRight,  label: 'Future Work',       color: 'text-brand-600' },
  ]

  const { mutate: analyzePaper, isPending } = useMutation({
    mutationFn: () => papersApi.analyze(paper.id),
    onSuccess: (res) => {
      toast.success('AI analysis generated!', {
        style: { background: '#ffffff', color: '#1F2937', border: '1px solid #E5E7EB' },
      })
      queryClient.invalidateQueries({ queryKey: ['papers'] })
      if (res?.analysis) {
        rec.analysis = res.analysis
      }
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-screen bg-white border-l border-gray-200 overflow-y-auto animate-slide-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">
                {paper.source === 'arxiv' ? 'arXiv' : 'Semantic Scholar'}
              </span>
              <span className="text-sm font-bold text-brand-600">{Math.round(rec.final_score ?? 0)}/100</span>
            </div>
            <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-3">{paper.title}</h2>
          </div>
          <button onClick={onClose} className="btn-secondary px-2 py-2 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Authors + Date */}
          <div className="text-xs text-gray-500 space-y-1">
            {paper.authors?.length > 0 && (
              <p><span className="text-gray-700 font-medium">Authors:</span> {paper.authors.join(', ')}</p>
            )}
            {paper.published_at && (
              <p><span className="text-gray-700 font-medium">Published:</span> {paper.published_at}</p>
            )}
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                <ExternalLink size={11} />
                View Full Paper
              </a>
            )}
          </div>

          {/* Abstract */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Abstract</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{paper.abstract}</p>
          </div>

          {/* Score Breakdown */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Relevance Scores</h3>
            <ScoreBar score={explanation.semantic_similarity?.score ?? 0} label="Semantic Similarity" />
            <ScoreBar score={explanation.keyword_match?.score ?? 0} label="Keyword Match" />
            <ScoreBar score={explanation.recency?.score ?? 0} label="Recency" />
            <div className="pt-1 border-t border-gray-200">
              <ScoreBar score={rec.final_score ?? 0} label="Final Score" />
            </div>
            {explanation.matched_keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] text-gray-400 self-center">Matched:</span>
                {explanation.matched_keywords.map(kw => (
                  <span key={kw} className="chip">{kw}</span>
                ))}
              </div>
            )}
          </div>

          {/* AI Analysis */}
          {Object.keys(analysis).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                AI Analysis
              </h3>
              <div className="space-y-2">
                {analysisFields.map(({ key, icon: Icon, label, color }) =>
                  analysis[key] ? (
                    <div key={key} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <div className={`flex items-center gap-1.5 mb-1.5 ${color}`}>
                        <Icon size={13} />
                        <span className="text-xs font-semibold">{label}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{analysis[key]}</p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {!Object.keys(analysis).length && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 text-center space-y-4">
              <p className="text-sm text-gray-500">
                AI analysis has not been generated for this paper yet.
              </p>
              <button
                onClick={() => analyzePaper()}
                disabled={isPending}
                className="btn-primary mx-auto"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {isPending ? 'Analyzing Paper...' : 'Generate AI Analysis'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

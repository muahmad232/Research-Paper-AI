import { ExternalLink, Users, Calendar, Tag, TrendingUp, AlertCircle } from 'lucide-react'
import { ScoreBar } from './ScoreBar'

export default function PaperCard({ rec, onClick }) {
  const paper = rec.papers || rec
  const score = rec.final_score ?? 0
  const category = rec.category
  const explanation = rec.explanation || {}
  const isEscalated = rec.escalated

  const categoryBadge = {
    highly_relevant: 'badge-highly-relevant',
    potentially_relevant: 'badge-potentially-relevant',
  }[category] || 'badge-potentially-relevant'

  const categoryLabel = {
    highly_relevant: '✦ Highly Relevant',
    potentially_relevant: '◈ Potentially Relevant',
  }[category] || 'Relevant'

  return (
    <article
      className="glass-hover rounded-2xl p-5 cursor-pointer animate-slide-in"
      onClick={() => onClick?.(rec)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={categoryBadge}>{categoryLabel}</span>
          {isEscalated && (
            <span className="badge-escalated">
              <AlertCircle size={10} />
              Needs Review
            </span>
          )}
          {paper.source && (
            <span className="badge bg-surface-500/80 text-gray-400 border border-white/5">
              {paper.source === 'arxiv' ? 'arXiv' : 'OpenAlex'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 shrink-0">
          <TrendingUp size={13} />
          <span className="text-sm font-bold gradient-text">{Math.round(score)}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-100 leading-snug mb-2 line-clamp-2">
        {paper.title}
      </h3>

      {/* Abstract */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
        {paper.abstract}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
        {paper.authors?.length > 0 && (
          <div className="flex items-center gap-1">
            <Users size={11} />
            <span className="truncate max-w-[160px]">{paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' +more' : ''}</span>
          </div>
        )}
        {paper.published_at && (
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            <span>{paper.published_at}</span>
          </div>
        )}
      </div>

      {/* Categories */}
      {paper.categories?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {paper.categories.slice(0, 3).map(cat => (
            <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-surface-600 text-gray-500 border border-white/5">
              <Tag size={8} />
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Score bar */}
      <ScoreBar score={score} />

      {/* Matched keywords */}
      {explanation.matched_keywords?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {explanation.matched_keywords.slice(0, 4).map(kw => (
            <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-500/20">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Link */}
      {paper.url && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ExternalLink size={11} />
            View Paper
          </a>
        </div>
      )}
    </article>
  )
}

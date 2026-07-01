import { useQuery } from '@tanstack/react-query'
import { BookOpen, TrendingUp } from 'lucide-react'
import Header from '../components/layout/Header'
import { LoadingSkeleton, EmptyState } from '../components/common'
import { gapsApi } from '../api'

const trendConfig = {
  gap:            { label: '🔍 Research Gap',    className: 'badge-gap',   desc: 'Under-explored area' },
  emerging_trend: { label: '🌱 Emerging Trend',  className: 'badge-trend', desc: 'Rising topic' },
  hot_topic:      { label: '🔥 Hot Topic',       className: 'badge-hot',   desc: 'Frequently studied' },
}

export default function ResearchGaps() {
  const { data, isLoading } = useQuery({
    queryKey: ['gaps'],
    queryFn: gapsApi.list,
  })

  const gaps = data?.gaps || []
  const byType = {
    gap:            gaps.filter(g => g.trend_type === 'gap'),
    emerging_trend: gaps.filter(g => g.trend_type === 'emerging_trend'),
    hot_topic:      gaps.filter(g => g.trend_type === 'hot_topic'),
  }

  return (
    <>
      <Header
        title="Research Gaps"
        subtitle="AI-detected gaps, trends, and hot topics in your field"
      />

      <div className="p-8 space-y-8 animate-fade-in">
        {/* Type breakdown */}
        {gaps.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(byType).map(([type, items]) => {
              const config = trendConfig[type]
              return (
                <div key={type} className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:border-gray-300 hover:shadow-sm transition-all">
                  <p className="text-3xl font-bold text-gray-900 mb-1">{items.length}</p>
                  <p className="text-xs text-gray-500 mb-2">{config.desc}</p>
                  <span className={`badge ${config.className}`}>{config.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Gap Cards */}
        {isLoading ? (
          <LoadingSkeleton count={3} />
        ) : gaps.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No research gaps detected yet"
            description="The agent needs at least 3 highly relevant papers to detect research gaps. Run the agent to get started."
          />
        ) : (
          <div className="space-y-3">
            {gaps.map(gap => {
              const config = trendConfig[gap.trend_type] || trendConfig.gap
              return (
                <div key={gap.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all animate-slide-in">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span className={`badge mb-2 ${config.className}`}>{config.label}</span>
                      <h3 className="text-base font-semibold text-gray-900">{gap.gap_title}</h3>
                    </div>
                    <div className="text-xs text-gray-400 text-right shrink-0">
                      {gap.created_at && new Date(gap.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{gap.description}</p>
                  {gap.supporting_paper_ids?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-3">
                      Based on {gap.supporting_paper_ids.length} relevant paper{gap.supporting_paper_ids.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

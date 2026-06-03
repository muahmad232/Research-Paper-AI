import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, TrendingUp, AlertTriangle, BookOpen,
  Sparkles, Calendar, ArrowRight, Zap
} from 'lucide-react'
import Header from '../components/layout/Header'
import PaperCard from '../components/papers/PaperCard'
import PaperDetail from '../components/papers/PaperDetail'
import { StatCard, LoadingSkeleton, EmptyState } from '../components/common'
import OnboardingModal from '../components/common/OnboardingModal'
import { papersApi, digestApi, escalationsApi, gapsApi } from '../api'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [selectedPaper, setSelectedPaper] = useState(null)

  const { data: papersData, isLoading: papersLoading } = useQuery({
    queryKey: ['papers', 'highly_relevant'],
    queryFn: () => papersApi.list({ category: 'highly_relevant', limit: 6 }),
  })

  const { data: digest } = useQuery({
    queryKey: ['digest-latest'],
    queryFn: digestApi.latest,
  })

  const { data: escalationsData } = useQuery({
    queryKey: ['escalations'],
    queryFn: escalationsApi.list,
  })

  const { data: gapsData } = useQuery({
    queryKey: ['gaps'],
    queryFn: gapsApi.list,
  })

  const papers = papersData?.papers || []
  const escalationCount = escalationsData?.total || 0
  const gapCount = gapsData?.total || 0

  const renderMarkdown = (text) => {
    if (!text) return null;
    const html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={digest?.digest_date ? `Daily digest for ${digest.digest_date}` : 'Research Paper Screening Agent'}
      />

      <div className="p-8 space-y-8 animate-fade-in">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Papers Fetched Today"
            value={digest?.total_fetched ?? '—'}
            icon={FileText}
            color="brand"
          />
          <StatCard
            label="Highly Relevant"
            value={digest?.highly_relevant ?? '—'}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Needs Review"
            value={escalationCount}
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            label="Research Gaps Found"
            value={gapCount}
            icon={BookOpen}
            color="cyan"
          />
        </div>

        {/* Daily Digest Card */}
        {digest?.summary && (
          <div className="glass rounded-2xl p-6 border border-brand-500/15">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-600/30 flex items-center justify-center">
                <Sparkles size={14} className="text-brand-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Today's AI Digest</h3>
              {digest.digest_date && (
                <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                  <Calendar size={11} />
                  {digest.digest_date}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{renderMarkdown(digest.summary)}</p>
          </div>
        )}

        {/* Top Papers */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap size={16} className="text-brand-400" />
                Top Recommendations
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Highest scoring papers from today's run</p>
            </div>
            <Link to="/papers" className="btn-secondary text-xs">
              View All
              <ArrowRight size={13} />
            </Link>
          </div>

          {papersLoading ? (
            <LoadingSkeleton count={3} />
          ) : papers.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No papers yet"
              description="Run the agent to fetch and screen research papers based on your profile."
              action={<p className="text-xs text-brand-400">Click "Run Agent" in the top bar to start</p>}
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {papers.map((rec) => (
                <PaperCard
                  key={rec.id}
                  rec={rec}
                  onClick={setSelectedPaper}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Gaps Preview */}
        {gapsData?.gaps?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen size={16} className="text-cyan-400" />
                Recent Research Gaps
              </h3>
              <Link to="/gaps" className="btn-secondary text-xs">
                View All
                <ArrowRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {gapsData.gaps.slice(0, 3).map(gap => (
                <div key={gap.id} className="glass rounded-2xl p-4">
                  <span className={`badge mb-2 ${
                    gap.trend_type === 'gap' ? 'badge-gap' :
                    gap.trend_type === 'emerging_trend' ? 'badge-trend' : 'badge-hot'
                  }`}>
                    {gap.trend_type === 'gap' ? '🔍 Research Gap' :
                     gap.trend_type === 'emerging_trend' ? '🌱 Emerging Trend' : '🔥 Hot Topic'}
                  </span>
                  <h4 className="text-sm font-semibold text-white mb-1">{gap.gap_title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{gap.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedPaper && (
        <PaperDetail rec={selectedPaper} onClose={() => setSelectedPaper(null)} />
      )}

      {/* First-visit onboarding tour — self-manages via localStorage */}
      <OnboardingModal />
    </>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, FileText, ArrowUpDown } from 'lucide-react'
import Header from '../components/layout/Header'
import PaperCard from '../components/papers/PaperCard'
import PaperDetail from '../components/papers/PaperDetail'
import { LoadingSkeleton, EmptyState } from '../components/common'
import { papersApi } from '../api'

const CATEGORIES = [
  { value: 'all',                  label: 'All Papers' },
  { value: 'highly_relevant',      label: '✦ Highly Relevant' },
  { value: 'potentially_relevant', label: '◈ Potentially Relevant' },
  { value: 'not_relevant',         label: '✗ Not Relevant' },
]

const SOURCES = [
  { value: '',         label: 'All Sources' },
  { value: 'arxiv',    label: 'arXiv' },
  { value: 'openalex', label: 'OpenAlex' },
]

const SORT_OPTIONS = [
  { value: 'score', label: 'Sort: Relevance' },
  { value: 'date',  label: 'Sort: Date Added' },
]

export default function Papers() {
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('all')
  const [source, setSource]     = useState('')
  const [sortBy, setSortBy]     = useState('score')

  const { data, isLoading } = useQuery({
    queryKey: ['papers', category, source, sortBy],
    queryFn: () => papersApi.list({
      category: category !== 'all' ? category : undefined,
      source:   source || undefined,
      sort_by:  sortBy,
      limit:    100,
    }),
  })

  const papers = (data?.papers || []).filter(rec => {
    if (!search) return true
    const paper = rec.papers || rec
    return (
      paper.title?.toLowerCase().includes(search.toLowerCase()) ||
      paper.abstract?.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <>
      <Header
        title="Papers"
        subtitle={`${papers.length} paper${papers.length !== 1 ? 's' : ''} in current view`}
      />

      <div className="p-8 space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="papers-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search titles and abstracts..."
              className="input-field pl-9"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              id="papers-category-filter"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input-field pl-9 pr-8 appearance-none cursor-pointer w-52"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <select
            id="papers-source-filter"
            value={source}
            onChange={e => setSource(e.target.value)}
            className="input-field pr-8 appearance-none cursor-pointer w-40"
          >
            {SOURCES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Sort control */}
          <div className="relative">
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              id="papers-sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="input-field pl-9 pr-8 appearance-none cursor-pointer w-44"
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <LoadingSkeleton count={4} />
        ) : papers.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No papers found"
            description="Try adjusting your filters or run the agent to fetch new papers."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {papers.map(rec => (
              <PaperCard key={rec.id} rec={rec} onClick={setSelectedPaper} />
            ))}
          </div>
        )}
      </div>

      {selectedPaper && (
        <PaperDetail rec={selectedPaper} onClose={() => setSelectedPaper(null)} />
      )}
    </>
  )
}

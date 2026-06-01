export function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="flex gap-2">
            <div className="skeleton h-5 w-28 rounded-full" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-700 border border-white/5 flex items-center justify-center mb-4">
        {Icon && <Icon size={28} className="text-gray-600" />}
      </div>
      <h3 className="text-sm font-semibold text-gray-400 mb-1">{title}</h3>
      <p className="text-xs text-gray-600 max-w-xs leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, trend, color = 'brand' }) {
  const colorMap = {
    brand: 'text-brand-400 bg-brand-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
    yellow: 'text-amber-400 bg-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {Icon && <Icon size={18} />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

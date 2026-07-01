export function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 animate-pulse">
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
      <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4">
        {Icon && <Icon size={28} className="text-gray-400" />}
      </div>
      <h3 className="text-sm font-semibold text-gray-600 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, trend, color = 'brand' }) {
  const colorMap = {
    brand:  'text-blue-700 bg-blue-50',
    green:  'text-emerald-700 bg-emerald-50',
    yellow: 'text-amber-700 bg-amber-50',
    rose:   'text-red-700 bg-red-50',
    cyan:   'text-teal-700 bg-teal-50',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {Icon && <Icon size={18} />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

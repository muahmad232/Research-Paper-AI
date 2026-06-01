export function ScoreBar({ score, label, color = 'brand' }) {
  const colorMap = {
    brand: 'from-brand-500 to-brand-400',
    green: 'from-emerald-500 to-emerald-400',
    yellow: 'from-amber-500 to-amber-400',
    blue: 'from-sky-500 to-sky-400',
  }

  const scoreColor =
    score >= 80 ? colorMap.green :
    score >= 50 ? colorMap.yellow :
    colorMap.brand

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-xs font-mono font-medium text-gray-300">
            {Math.round(score)}/100
          </span>
        </div>
      )}
      <div className="score-bar">
        <div
          className={`score-bar-fill bg-gradient-to-r ${scoreColor}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  )
}

export function ScoreBar({ score, label }) {
  // Score fill colour: green for high, amber for mid, navy for lower
  const fillColor =
    score >= 80 ? '#16a34a' :   // emerald-600
    score >= 50 ? '#d97706' :   // amber-600
    '#2563EB'                   // brand-500 (blue)

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-xs font-mono font-medium text-gray-700">
            {Math.round(score)}/100
          </span>
        </div>
      )}
      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            background: fillColor,
          }}
        />
      </div>
    </div>
  )
}

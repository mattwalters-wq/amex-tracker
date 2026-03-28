export default function ProgressBar({ value, max, color = '#7A9E8E', showPaceMarker = false, paceValue }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const pacePct = max > 0 && paceValue != null ? Math.min(100, (paceValue / max) * 100) : null
  const over = value > max

  return (
    <div className="relative h-2 bg-black/[0.06] rounded-full overflow-visible">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: pct + '%', backgroundColor: over ? '#C4705A' : color }}
      />
      {showPaceMarker && pacePct != null && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-stone-400/60 rounded-full"
          style={{ left: pacePct + '%' }}
          title="Expected pace"
        />
      )}
    </div>
  )
}

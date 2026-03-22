/**
 * TimelineGrid — the vertical 24-hour ruler.
 * Renders hour labels and hour/quarter-hour tick lines.
 * Used as a background layer; entry blocks are absolutely positioned on top.
 */
import { memo } from 'react'

export const HOUR_HEIGHT_PX = 80   // pixels per hour
export const PX_PER_MS = HOUR_HEIGHT_PX / (60 * 60 * 1000)
export const TOTAL_HEIGHT_PX = HOUR_HEIGHT_PX * 24

interface TimelineGridProps {
  /** Highlight the current hour */
  currentHour?: number
}

export const TimelineGrid = memo(function TimelineGrid({ currentHour }: TimelineGridProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ height: TOTAL_HEIGHT_PX }}
      aria-hidden="true"
    >
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 flex items-start"
          style={{ top: hour * HOUR_HEIGHT_PX }}
        >
          {/* Hour label */}
          <div className={`w-12 pr-2 text-right text-[10px] font-mono leading-none flex-shrink-0 mt-[-5px] ${
            hour === currentHour ? 'text-indigo-400 font-semibold' : 'text-slate-600'
          }`}>
            {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
          </div>

          {/* Hour line */}
          <div className={`flex-1 border-t ${hour === currentHour ? 'border-indigo-500/40' : 'border-slate-700/50'}`} />
        </div>
      ))}

      {/* Quarter-hour ticks (no labels) */}
      {Array.from({ length: 24 * 3 }, (_, i) => {
        const quarterIndex = i + 1          // skip 0 which is the hour line
        if (quarterIndex % 4 === 0) return null // skip full hours
        return (
          <div
            key={`q-${i}`}
            className="absolute right-0 left-12 border-t border-slate-800/60"
            style={{ top: (quarterIndex / 4) * HOUR_HEIGHT_PX }}
          />
        )
      })}

      {/* Now indicator */}
      <NowIndicator />
    </div>
  )
})

function NowIndicator() {
  const now = new Date()
  const minutesFromMidnight = now.getHours() * 60 + now.getMinutes()
  const top = (minutesFromMidnight / 60) * HOUR_HEIGHT_PX

  return (
    <div
      className="absolute left-12 right-0 flex items-center"
      style={{ top }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0 shadow shadow-red-500/50" />
      <div className="flex-1 border-t border-red-500/60" />
    </div>
  )
}

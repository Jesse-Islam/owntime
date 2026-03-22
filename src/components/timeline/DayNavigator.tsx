/**
 * DayNavigator — date header with prev/next arrows and a "Today" jump button.
 * Keyboard: ArrowLeft / ArrowRight when no input is focused.
 */
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { addDays, isSameDay } from '../../engine/timeEngine'

interface DayNavigatorProps {
  date: Date
  onDateChange: (d: Date) => void
  totalMs: number
}

const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function DayNavigator({ date, onDateChange, totalMs }: DayNavigatorProps) {
  const today = new Date()
  const isToday = isSameDay(date, today)

  useHotkeys('ArrowLeft',  () => onDateChange(addDays(date, -1)), { enableOnFormTags: false })
  useHotkeys('ArrowRight', () => onDateChange(addDays(date, +1)), { enableOnFormTags: false })

  const hours   = Math.floor(totalMs / 3_600_000)
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000)
  const totalLabel = totalMs > 0
    ? hours > 0 ? `${hours}h ${minutes}m tracked` : `${minutes}m tracked`
    : 'No entries'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
      {/* Prev */}
      <button
        onClick={() => onDateChange(addDays(date, -1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Date label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-100 truncate">
            {isToday ? 'Today' : DAY_LABELS[date.getDay()]}
            <span className="text-slate-500 font-normal ml-1.5">
              {MONTH_LABELS[date.getMonth()]} {date.getDate()}
            </span>
          </h2>
          {!isToday && (
            <button
              onClick={() => onDateChange(today)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          {totalLabel}
        </p>
      </div>

      {/* Next */}
      <button
        onClick={() => onDateChange(addDays(date, +1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Next day"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

import { motion } from 'framer-motion'
import { useTimer } from '../store/timerStore'
import { formatDuration, formatDurationCompact } from '../engine/timeEngine'
import { Clock, Tag } from 'lucide-react'

export function TimerPage() {
  const { state } = useTimer()
  const { runningEntry, elapsedMs, isLoading } = state
  const { display } = formatDuration(elapsedMs)

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-8 px-4 py-16">
      {/* Clock display */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-7xl md:text-8xl font-mono font-thin tracking-tight text-slate-100 tabular-nums">
          {isLoading ? (
            <span className="text-slate-600">--:--:--</span>
          ) : runningEntry ? (
            <motion.span
              key={display}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
            >
              {display}
            </motion.span>
          ) : (
            <span className="text-slate-600">00:00:00</span>
          )}
        </div>

        {runningEntry && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-slate-400 font-medium"
          >
            Tracking since {new Date(runningEntry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </motion.p>
        )}
      </motion.div>

      {/* Status card */}
      <motion.div
        layout
        className={`
          w-full max-w-sm rounded-2xl border px-6 py-5 text-sm
          ${runningEntry
            ? 'bg-indigo-500/5 border-indigo-500/20'
            : 'bg-slate-800/50 border-slate-700/50'
          }
        `}
      >
        {runningEntry ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Timer running</span>
            </div>
            <div className="text-3xl font-mono font-light text-slate-100">
              {formatDurationCompact(elapsedMs)}
            </div>
            {runningEntry.tagIds.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500 text-xs">{runningEntry.tagIds.length} tag(s)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-500">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span>Use the action bar above to start tracking. Press <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400 text-xs font-mono">Space</kbd> for a quick start.</span>
          </div>
        )}
      </motion.div>
    </div>
  )
}

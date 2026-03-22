import { motion } from 'framer-motion'
import { useTimer } from '../store/timerStore'
import { formatDuration, formatDurationCompact } from '../engine/timeEngine'
import { Clock } from 'lucide-react'

export function TimerPage() {
  const { state } = useTimer()
  const { runningEntry, elapsedMs, isLoading } = state
  const { display } = formatDuration(elapsedMs)

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-8 px-4 py-16">
      {/* Clock */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-7xl md:text-8xl font-mono font-thin tracking-tight tabular-nums"
          style={{ color: isLoading || !runningEntry ? 'var(--ot-faint)' : 'var(--ot-text)' }}
        >
          {isLoading ? '--:--:--' : runningEntry ? (
            <motion.span key={display} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>
              {display}
            </motion.span>
          ) : '00:00:00'}
        </div>

        {runningEntry && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm ot-muted font-medium">
            Tracking since {new Date(runningEntry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </motion.p>
        )}
      </motion.div>

      {/* Status card */}
      <motion.div
        layout
        className="w-full max-w-sm rounded-2xl border px-6 py-5 text-sm"
        style={{
          backgroundColor: runningEntry ? 'var(--ot-accent-bg)' : 'var(--ot-surface)',
          borderColor: runningEntry ? 'var(--ot-accent)' : 'var(--ot-border)',
          borderWidth: 1,
          borderStyle: 'solid',
          opacity: runningEntry ? 1 : 0.6,
        }}
      >
        {runningEntry ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ot-accent-text)' }} />
              <span className="font-medium ot-text">Timer running</span>
            </div>
            <div className="text-3xl font-mono font-light ot-text">
              {formatDurationCompact(elapsedMs)}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 ot-muted">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span>
              Press{' '}
              <kbd
                className="px-1.5 py-0.5 rounded text-xs font-mono border"
                style={{ backgroundColor: 'var(--ot-surface2)', borderColor: 'var(--ot-border)', color: 'var(--ot-muted)' }}
              >
                Space
              </kbd>
              {' '}or tap ▶ to start.
            </span>
          </div>
        )}
      </motion.div>
    </div>
  )
}

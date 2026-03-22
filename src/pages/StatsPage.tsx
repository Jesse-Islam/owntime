import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EntriesRepository } from '../db/EntriesRepository'
import { TagsRepository } from '../db/TagsRepository'
import { formatDurationCompact, startOfDay, addDays } from '../engine/timeEngine'
import { useTimer } from '../store/timerStore'
import type { Tag } from '../db/schema'

type RangeTab = 'day' | 'week' | 'month' | 'year'

const TABS: { id: RangeTab; label: string }[] = [
  { id: 'day',   label: 'Day'   },
  { id: 'week',  label: 'Week'  },
  { id: 'month', label: 'Month' },
  { id: 'year',  label: 'Year'  },
]

interface TagStat {
  tag: Tag | null  // null = untagged
  totalMs: number
  pct: number
  color: string
  label: string
}

function getRange(tab: RangeTab): { from: number; to: number } {
  const now = new Date()
  const todayStart = startOfDay(now).getTime()
  switch (tab) {
    case 'day':   return { from: todayStart,                        to: Date.now() }
    case 'week':  return { from: addDays(now, -6).setHours(0,0,0,0), to: Date.now() }
    case 'month': return { from: addDays(now, -29).setHours(0,0,0,0), to: Date.now() }
    case 'year':  return { from: addDays(now, -364).setHours(0,0,0,0), to: Date.now() }
  }
}

const UNTAGGED_COLOR = '#94a3b8'

// SVG donut chart
const R = 70
const CX = 100
const CY = 100
const CIRCUMFERENCE = 2 * Math.PI * R
const STROKE_WIDTH = 22
const GAP = 2  // px gap between segments (in circumference units)

interface DonutSegment {
  color: string
  dashLength: number
  dashOffset: number
}

function buildSegments(stats: TagStat[]): DonutSegment[] {
  const segments: DonutSegment[] = []
  let offset = 0
  for (const s of stats) {
    const dashLength = Math.max(0, (s.pct / 100) * CIRCUMFERENCE - GAP)
    segments.push({ color: s.color, dashLength, dashOffset: -offset })
    offset += dashLength + GAP
  }
  return segments
}

export function StatsPage() {
  const { state } = useTimer()
  const { runningEntry, elapsedMs } = state

  const [tab, setTab] = useState<RangeTab>('week')
  const [stats, setStats]     = useState<TagStat[]>([])
  const [totalMs, setTotalMs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { from, to } = getRange(tab)
      const [entries, allTags] = await Promise.all([
        EntriesRepository.getRange(from, to),
        TagsRepository.getAll(),
      ])

      if (cancelled) return

      const tagMap = new Map<string, Tag>(allTags.map((t) => [t.id, t]))
      const msPerTag = new Map<string | null, number>()
      let total = 0

      for (const entry of entries) {
        if (!entry.stoppedAt) continue
        const dur = entry.stoppedAt - entry.startedAt
        total += dur

        if (entry.tagIds.length === 0) {
          msPerTag.set(null, (msPerTag.get(null) ?? 0) + dur)
        } else {
          for (const tid of entry.tagIds) {
            // Split duration equally across tags on the entry
            const share = dur / entry.tagIds.length
            msPerTag.set(tid, (msPerTag.get(tid) ?? 0) + share)
          }
        }
      }

      const rows: TagStat[] = []
      for (const [key, ms] of msPerTag.entries()) {
        if (key === null) {
          rows.push({ tag: null, totalMs: ms, pct: 0, color: UNTAGGED_COLOR, label: 'Untagged' })
        } else {
          const tag = tagMap.get(key)
          if (!tag) continue
          rows.push({ tag, totalMs: ms, pct: 0, color: tag.color, label: tag.name })
        }
      }
      rows.sort((a, b) => b.totalMs - a.totalMs)

      if (total > 0) {
        for (const r of rows) {
          r.pct = (r.totalMs / total) * 100
        }
      }

      setStats(rows)
      setTotalMs(total)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [tab, runningEntry])

  const segments = useMemo(() => buildSegments(stats), [stats])

  const isEmpty = !loading && totalMs === 0

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 pb-8">
      {/* Tab bar */}
      <div
        className="flex rounded-lg overflow-hidden border"
        style={{ borderColor: 'var(--ot-border)', backgroundColor: 'var(--ot-surface)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-sm font-medium transition-colors relative"
            style={{
              color: tab === t.id ? 'var(--ot-accent-text)' : 'var(--ot-muted)',
              backgroundColor: tab === t.id ? 'var(--ot-accent-bg)' : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-24 ot-faint text-sm"
          >
            Loading…
          </motion.div>
        ) : isEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-2 ot-faint"
          >
            <p className="text-sm">No tracked time for this period.</p>
            <p className="text-xs opacity-60">Start tracking to see your breakdown here.</p>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Donut chart card */}
            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: 'var(--ot-surface)', borderColor: 'var(--ot-border)' }}
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* SVG donut */}
                <div className="relative flex-shrink-0">
                  <svg
                    width="200" height="200"
                    viewBox="0 0 200 200"
                    style={{ transform: 'rotate(-90deg)' }}
                  >
                    {/* Background ring */}
                    <circle
                      cx={CX} cy={CY} r={R}
                      fill="none"
                      strokeWidth={STROKE_WIDTH}
                      style={{ stroke: 'var(--ot-surface2)' }}
                    />
                    {segments.map((seg, i) => (
                      <circle
                        key={i}
                        cx={CX} cy={CY} r={R}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={`${seg.dashLength} ${CIRCUMFERENCE}`}
                        strokeDashoffset={seg.dashOffset}
                        strokeLinecap="butt"
                      />
                    ))}
                  </svg>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-mono font-light ot-text tabular-nums">
                      {formatDurationCompact(totalMs + (tab === 'day' && runningEntry ? elapsedMs : 0))}
                    </span>
                    <span className="text-[10px] ot-faint mt-0.5 uppercase tracking-wide">
                      {TABS.find(t => t.id === tab)?.label}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 w-full space-y-2">
                  {stats.slice(0, 10).map((s) => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-sm ot-text truncate">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-mono ot-muted">
                            {formatDurationCompact(s.totalMs)}
                          </span>
                          <span
                            className="text-xs font-medium w-10 text-right tabular-nums"
                            style={{ color: s.color }}
                          >
                            {s.pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {/* Mini bar */}
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--ot-surface2)' }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.pct}%` }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Running timer callout (day tab) */}
            {tab === 'day' && runningEntry && (
              <div
                className="flex items-center gap-2 rounded-lg px-4 py-3 border text-sm"
                style={{ backgroundColor: 'var(--ot-accent-bg)', borderColor: 'var(--ot-accent)' }}
              >
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                <span className="ot-text">
                  Timer running · <span className="font-mono">{formatDurationCompact(elapsedMs)}</span> not yet included above
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

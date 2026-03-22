import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, Tag } from 'lucide-react'
import { EntriesRepository } from '../db/EntriesRepository'
import { TagsRepository } from '../db/TagsRepository'
import { aggregateByDay, formatDurationCompact, addDays, isSameDay, MS_PER_HOUR } from '../engine/timeEngine'
import { useTimer } from '../store/timerStore'
import type { Tag as TagType } from '../db/schema'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
interface DayStat { date: Date; totalMs: number; label: string }
interface TagStat { tag: TagType; totalMs: number }

function buildWeekDays(today: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
}

export function StatsPage() {
  const { state } = useTimer()
  const { runningEntry, elapsedMs } = state

  const [todayMs, setTodayMs] = useState(0)
  const [weekDays, setWeekDays] = useState<DayStat[]>([])
  const [tagStats, setTagStats] = useState<TagStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    const weekStart = addDays(today, -6)

    async function load() {
      setLoading(true)
      const [entries, allTags] = await Promise.all([
        EntriesRepository.getRange(weekStart.setHours(0, 0, 0, 0), Date.now()),
        TagsRepository.getAll(),
      ])

      // Today total
      const todayEntries = entries.filter((e) => isSameDay(new Date(e.startedAt), today))
      const todayTotal = todayEntries.reduce((s, e) => s + (e.stoppedAt ?? Date.now()) - e.startedAt, 0)
      setTodayMs(todayTotal)

      // Week aggregation
      const dayMap = aggregateByDay(entries)
      const days = buildWeekDays(today).map((date) => {
        const key = date.toISOString().slice(0, 10)
        const stat = dayMap.get(key)
        return {
          date,
          totalMs: stat?.totalMs ?? 0,
          label: isSameDay(date, today) ? 'Today' : DAY_SHORT[date.getDay()],
        }
      })
      setWeekDays(days)

      // Tag stats for the week
      const tagMap = new Map<string, number>()
      for (const entry of entries) {
        if (!entry.stoppedAt) continue
        const dur = entry.stoppedAt - entry.startedAt
        for (const tagId of entry.tagIds) {
          tagMap.set(tagId, (tagMap.get(tagId) ?? 0) + dur)
        }
      }
      const stats: TagStat[] = allTags
        .filter((t) => tagMap.has(t.id))
        .map((tag) => ({ tag, totalMs: tagMap.get(tag.id)! }))
        .sort((a, b) => b.totalMs - a.totalMs)
      setTagStats(stats)

      setLoading(false)
    }

    load()
  }, [runningEntry]) // re-run when timer stops/starts

  const maxDayMs = Math.max(...weekDays.map((d) => d.totalMs), MS_PER_HOUR)
  const maxTagMs = tagStats[0]?.totalMs ?? MS_PER_HOUR
  const weekTotal = weekDays.reduce((s, d) => s + d.totalMs, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 ot-faint text-sm">
        Loading…
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-2xl mx-auto space-y-4 pb-8"
    >
      {/* Today card */}
      <section
        className="rounded-xl p-4 border"
        style={{ backgroundColor: 'var(--ot-surface)', borderColor: 'var(--ot-border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" style={{ color: 'var(--ot-accent-text)' }} />
          <h2 className="text-sm font-semibold ot-text">Today</h2>
        </div>

        <div className="text-4xl font-mono font-light ot-text tabular-nums">
          {formatDurationCompact(todayMs + (runningEntry ? elapsedMs : 0)) || '0m'}
        </div>

        {runningEntry && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs ot-muted">
              Timer running · +{formatDurationCompact(elapsedMs)}
            </span>
          </div>
        )}

        {todayMs === 0 && !runningEntry && (
          <p className="text-xs ot-faint mt-1">No time tracked yet today.</p>
        )}
      </section>

      {/* 7-day bar chart */}
      <section
        className="rounded-xl p-4 border"
        style={{ backgroundColor: 'var(--ot-surface)', borderColor: 'var(--ot-border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--ot-accent-text)' }} />
            <h2 className="text-sm font-semibold ot-text">Last 7 days</h2>
          </div>
          <span className="text-xs ot-muted">
            {formatDurationCompact(weekTotal)} total
          </span>
        </div>

        <div className="flex items-end gap-1.5 h-24">
          {weekDays.map(({ date, totalMs, label }) => {
            const pct = totalMs / maxDayMs
            const isToday = isSameDay(date, new Date())
            return (
              <div key={date.toISOString()} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end" style={{ height: '72px' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct * 100, totalMs > 0 ? 4 : 0)}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.05 }}
                    className="w-full rounded-t-sm"
                    style={{
                      backgroundColor: isToday
                        ? 'var(--ot-accent)'
                        : totalMs > 0 ? 'var(--ot-accent-bg)' : 'var(--ot-surface2)',
                      border: isToday ? `1px solid var(--ot-accent)` : undefined,
                      minHeight: totalMs > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <div className="text-center">
                  <div
                    className="text-[9px] font-medium leading-none"
                    style={{ color: isToday ? 'var(--ot-accent-text)' : 'var(--ot-faint)' }}
                  >
                    {label}
                  </div>
                  {totalMs > 0 && (
                    <div className="text-[9px] ot-faint leading-none mt-0.5">
                      {formatDurationCompact(totalMs)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Tag breakdown */}
      {tagStats.length > 0 && (
        <section
          className="rounded-xl p-4 border"
          style={{ backgroundColor: 'var(--ot-surface)', borderColor: 'var(--ot-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4" style={{ color: 'var(--ot-accent-text)' }} />
            <h2 className="text-sm font-semibold ot-text">This week by tag</h2>
          </div>

          <div className="space-y-3">
            {tagStats.slice(0, 8).map(({ tag, totalMs: tms }) => {
              const pct = tms / maxTagMs
              return (
                <div key={tag.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm ot-text">{tag.name}</span>
                    </div>
                    <span className="text-xs font-mono ot-muted">{formatDurationCompact(tms)}</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--ot-surface2)' }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {tagStats.length === 0 && weekTotal === 0 && (
        <div className="text-center py-8 ot-faint text-sm">
          Start tracking time to see your stats here.
        </div>
      )}
    </motion.div>
  )
}

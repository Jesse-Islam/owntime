/**
 * Phase 3 — TimeEngine unit tests
 * Covers: duration formatting, elapsed time, day boundaries,
 *         midnight-spanning splits, snap-to-grid, and weekly aggregation.
 */
import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatDurationCompact,
  elapsedMs,
  startOfDay,
  endOfDay,
  isSameDay,
  addDays,
  splitAcrossDays,
  snapToGrid,
  snapFloor,
  snapCeil,
  aggregateByDay,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
} from '../engine/timeEngine'

// ─── formatDuration ──────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats zero ms as 00:00:00', () => {
    expect(formatDuration(0).display).toBe('00:00:00')
  })

  it('formats exactly 1 hour', () => {
    const r = formatDuration(MS_PER_HOUR)
    expect(r.hours).toBe(1)
    expect(r.minutes).toBe(0)
    expect(r.seconds).toBe(0)
    expect(r.display).toBe('01:00:00')
  })

  it('formats 1h 5m 3s', () => {
    const ms = MS_PER_HOUR + 5 * MS_PER_MINUTE + 3 * MS_PER_SECOND
    const r = formatDuration(ms)
    expect(r.display).toBe('01:05:03')
  })

  it('handles durations > 24 hours', () => {
    const ms = 25 * MS_PER_HOUR + 30 * MS_PER_MINUTE
    const r = formatDuration(ms)
    expect(r.hours).toBe(25)
    expect(r.minutes).toBe(30)
    expect(r.display).toBe('25:30:00')
  })

  it('clamps negative ms to 0', () => {
    expect(formatDuration(-5000).display).toBe('00:00:00')
  })

  it('ignores sub-second ms (floors to whole seconds)', () => {
    // 1999 ms = 1 second (floor)
    expect(formatDuration(1999).seconds).toBe(1)
  })
})

// ─── formatDurationCompact ───────────────────────────────────────────────────

describe('formatDurationCompact', () => {
  it('returns seconds-only for < 1 minute', () => {
    expect(formatDurationCompact(45 * MS_PER_SECOND)).toBe('45s')
  })

  it('returns minutes-only string for < 1 hour', () => {
    expect(formatDurationCompact(37 * MS_PER_MINUTE)).toBe('37m')
  })

  it('returns hours + minutes string', () => {
    expect(formatDurationCompact(2 * MS_PER_HOUR + 5 * MS_PER_MINUTE)).toBe('2h 5m')
  })

  it('returns 0s for zero ms', () => {
    expect(formatDurationCompact(0)).toBe('0s')
  })
})

// ─── elapsedMs ───────────────────────────────────────────────────────────────

describe('elapsedMs', () => {
  it('returns stoppedAt - startedAt for completed entries', () => {
    expect(elapsedMs(1000, 4000)).toBe(3000)
  })

  it('uses now when stoppedAt is null (running entry)', () => {
    const start = 1000
    const now = 5000
    expect(elapsedMs(start, null, now)).toBe(4000)
  })
})

// ─── Day boundaries ──────────────────────────────────────────────────────────

describe('startOfDay / endOfDay', () => {
  it('startOfDay returns midnight', () => {
    const d = new Date(2024, 5, 15, 14, 30, 0)
    const s = startOfDay(d)
    expect(s.getHours()).toBe(0)
    expect(s.getMinutes()).toBe(0)
    expect(s.getSeconds()).toBe(0)
    expect(s.getMilliseconds()).toBe(0)
  })

  it('endOfDay returns 23:59:59.999', () => {
    const d = new Date(2024, 5, 15, 8, 0, 0)
    const e = endOfDay(d)
    expect(e.getHours()).toBe(23)
    expect(e.getMinutes()).toBe(59)
    expect(e.getSeconds()).toBe(59)
    expect(e.getMilliseconds()).toBe(999)
  })

  it('startOfDay does not mutate the input', () => {
    const d = new Date(2024, 5, 15, 14, 30, 0)
    const original = d.getTime()
    startOfDay(d)
    expect(d.getTime()).toBe(original)
  })
})

describe('isSameDay', () => {
  it('returns true for same day different times', () => {
    expect(isSameDay(new Date(2024, 2, 1, 0, 0, 0), new Date(2024, 2, 1, 23, 59, 59))).toBe(true)
  })

  it('returns false for different days', () => {
    expect(isSameDay(new Date(2024, 2, 1), new Date(2024, 2, 2))).toBe(false)
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    const base = new Date(2024, 0, 30) // Jan 30 local
    const result = addDays(base, 3)
    expect(result.getDate()).toBe(2)   // Feb 2
    expect(result.getMonth()).toBe(1)  // February
  })

  it('subtracts days with negative offset', () => {
    const base = new Date(2024, 2, 5) // Mar 5 local
    const result = addDays(base, -5)
    expect(result.getDate()).toBe(29)  // Feb 29 (2024 is leap year)
  })

  it('does not mutate the original date', () => {
    const base = new Date('2024-06-01')
    const original = base.getTime()
    addDays(base, 7)
    expect(base.getTime()).toBe(original)
  })
})

// ─── splitAcrossDays ─────────────────────────────────────────────────────────

describe('splitAcrossDays — same-day entry', () => {
  it('returns a single slice for an entry within one day', () => {
    const start = new Date(2024, 5, 15, 9,  0, 0).getTime()
    const stop  = new Date(2024, 5, 15, 10, 30, 0).getTime()
    const slices = splitAcrossDays(start, stop)
    expect(slices).toHaveLength(1)
    expect(slices[0].durationMs).toBe(90 * MS_PER_MINUTE)
  })

  it('the slice date is the start-of-day of the entry', () => {
    const start = new Date(2024, 5, 15, 22, 0, 0).getTime() // Jun 15 22:00 local
    const stop  = new Date(2024, 5, 15, 23, 0, 0).getTime() // Jun 15 23:00 local
    const slices = splitAcrossDays(start, stop)
    expect(slices[0].date.getHours()).toBe(0)
    expect(isSameDay(slices[0].date, new Date(2024, 5, 15))).toBe(true)
  })
})

describe('splitAcrossDays — midnight-spanning entry', () => {
  it('splits a 2.5-hour entry spanning midnight into two slices', () => {
    // 23:00 → 01:30 the following day (local time)
    const start = new Date(2024, 5, 15, 23, 0, 0).getTime()
    const stop  = new Date(2024, 5, 16,  1, 30, 0).getTime()
    const slices = splitAcrossDays(start, stop)

    expect(slices).toHaveLength(2)

    // Day 1: 23:00 → midnight = 60 min exactly (exclusive boundary)
    expect(isSameDay(slices[0].date, new Date(2024, 5, 15))).toBe(true)
    expect(slices[0].durationMs).toBe(60 * MS_PER_MINUTE)

    // Day 2: midnight → 01:30 = 90 min
    expect(isSameDay(slices[1].date, new Date(2024, 5, 16))).toBe(true)
    expect(slices[1].durationMs).toBe(90 * MS_PER_MINUTE)
  })

  it('splits a 3-day entry spanning two midnights into three slices', () => {
    const start = new Date(2024, 5, 14, 22, 0, 0).getTime()
    const stop  = new Date(2024, 5, 16,  2, 0, 0).getTime()
    const slices = splitAcrossDays(start, stop)
    expect(slices).toHaveLength(3)
  })

  it('total duration across slices equals overall duration', () => {
    const start = new Date(2024, 5, 15, 23, 0, 0).getTime()
    const stop  = new Date(2024, 5, 16,  1, 30, 0).getTime()
    const slices = splitAcrossDays(start, stop)
    const total = slices.reduce((s, sl) => s + sl.durationMs, 0)
    expect(total).toBe(stop - start)
  })

  it('handles null stoppedAt using provided now', () => {
    const start = new Date(2024, 5, 15, 23, 0, 0).getTime()
    const now   = new Date(2024, 5, 16,  1,  0, 0).getTime()
    const slices = splitAcrossDays(start, null, now)
    expect(slices).toHaveLength(2)
  })

  it('returns empty array when stoppedAt <= startedAt', () => {
    const t = Date.now()
    expect(splitAcrossDays(t, t)).toHaveLength(0)
    expect(splitAcrossDays(t + 100, t)).toHaveLength(0)
  })
})

// ─── Snap to grid ────────────────────────────────────────────────────────────

describe('snapToGrid', () => {
  // Reference: midnight 2024-06-15 (local time)
  const midnight = new Date(2024, 5, 15, 0, 0, 0).getTime()

  it('snaps to nearest 15-min boundary (rounds up at 7.5 min)', () => {
    const t = midnight + 7 * MS_PER_MINUTE + 31 * MS_PER_SECOND // 7m31s → 15m
    expect(snapToGrid(t)).toBe(midnight + 15 * MS_PER_MINUTE)
  })

  it('snaps to nearest 15-min boundary (rounds down at 7 min)', () => {
    const t = midnight + 7 * MS_PER_MINUTE + 29 * MS_PER_SECOND // 7m29s → 0m
    expect(snapToGrid(t)).toBe(midnight)
  })

  it('already-snapped timestamps are unchanged', () => {
    const t = midnight + 30 * MS_PER_MINUTE
    expect(snapToGrid(t)).toBe(t)
  })

  it('supports custom grid size (5 minutes)', () => {
    const t = midnight + 7 * MS_PER_MINUTE
    expect(snapToGrid(t, 5)).toBe(midnight + 5 * MS_PER_MINUTE)
  })
})

describe('snapFloor', () => {
  const midnight = new Date(2024, 5, 15, 0, 0, 0).getTime()

  it('floors to previous 15-min boundary', () => {
    const t = midnight + 14 * MS_PER_MINUTE + 59 * MS_PER_SECOND
    expect(snapFloor(t)).toBe(midnight) // still on the 0-minute mark
  })
})

describe('snapCeil', () => {
  const midnight = new Date(2024, 5, 15, 0, 0, 0).getTime()

  it('ceils to next 15-min boundary', () => {
    const t = midnight + 1 * MS_PER_SECOND // just past midnight
    expect(snapCeil(t)).toBe(midnight + 15 * MS_PER_MINUTE)
  })

  it('already-aligned timestamp returns itself', () => {
    const t = midnight + 15 * MS_PER_MINUTE
    expect(snapCeil(t)).toBe(t)
  })
})

// ─── aggregateByDay ───────────────────────────────────────────────────────────

describe('aggregateByDay', () => {
  it('returns an empty map for no entries', () => {
    expect(aggregateByDay([]).size).toBe(0)
  })

  it('accumulates same-day entries correctly', () => {
    const entries = [
      { startedAt: new Date(2024, 5, 15, 9,  0, 0).getTime(), stoppedAt: new Date(2024, 5, 15, 10,  0, 0).getTime() },
      { startedAt: new Date(2024, 5, 15, 14, 0, 0).getTime(), stoppedAt: new Date(2024, 5, 15, 15, 30, 0).getTime() },
    ]
    const map = aggregateByDay(entries)
    // Find the June 15 entry regardless of timezone formatting
    const june15 = [...map.values()].find((v) => isSameDay(v.date, new Date(2024, 5, 15)))
    expect(june15).toBeDefined()
    expect(june15!.totalMs).toBe(2.5 * MS_PER_HOUR)
    expect(june15!.entryCount).toBe(2)
  })

  it('splits a midnight-spanning entry across two days', () => {
    const entries = [
      {
        startedAt: new Date(2024, 5, 15, 23, 0, 0).getTime(),
        stoppedAt: new Date(2024, 5, 16,  1, 0, 0).getTime(),
      },
    ]
    const map = aggregateByDay(entries)
    expect(map.size).toBe(2)
    const days = [...map.values()].map((v) => v.date)
    expect(days.some((d) => isSameDay(d, new Date(2024, 5, 15)))).toBe(true)
    expect(days.some((d) => isSameDay(d, new Date(2024, 5, 16)))).toBe(true)
  })

  it('handles running entries (null stoppedAt) via provided now', () => {
    const start = new Date(2024, 5, 15, 12, 0, 0).getTime()
    const now   = new Date(2024, 5, 15, 13, 0, 0).getTime()
    const map = aggregateByDay([{ startedAt: start, stoppedAt: null }], now)
    const june15 = [...map.values()].find((v) => isSameDay(v.date, new Date(2024, 5, 15)))
    expect(june15!.totalMs).toBe(MS_PER_HOUR)
  })
})

/**
 * TimeEngine — pure stateless utility functions for time calculations.
 * No DB or React dependencies. Fully unit-testable.
 */

export const MS_PER_SECOND = 1_000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR   = 60 * MS_PER_MINUTE
export const MS_PER_DAY    = 24 * MS_PER_HOUR

// ─── Duration formatting ─────────────────────────────────────────────────────

export interface FormattedDuration {
  hours:   number
  minutes: number
  seconds: number
  /** HH:MM:SS string */
  display: string
}

/**
 * Convert a millisecond duration into { hours, minutes, seconds, display }.
 * Clamps negative values to 0. Handles durations > 24 hours correctly.
 */
export function formatDuration(ms: number): FormattedDuration {
  const total = Math.max(0, Math.floor(ms))
  const hours   = Math.floor(total / MS_PER_HOUR)
  const minutes = Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE)
  const seconds = Math.floor((total % MS_PER_MINUTE) / MS_PER_SECOND)

  const pad = (n: number) => String(n).padStart(2, '0')
  const display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`

  return { hours, minutes, seconds, display }
}

/**
 * Format ms as a compact human string: "2h 5m", "45m", "30s".
 * Used in summary views where HH:MM:SS is too verbose.
 */
export function formatDurationCompact(ms: number): string {
  const { hours, minutes, seconds } = formatDuration(ms)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

// ─── Elapsed time ────────────────────────────────────────────────────────────

/**
 * Elapsed milliseconds from startedAt up to now (or stoppedAt if provided).
 * Safe to call with a null stoppedAt (live entry).
 */
export function elapsedMs(startedAt: number, stoppedAt: number | null, now = Date.now()): number {
  return (stoppedAt ?? now) - startedAt
}

// ─── Day boundaries ──────────────────────────────────────────────────────────

/** Start of day in local time (00:00:00.000). */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** End of day in local time (23:59:59.999). */
export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** True if two Date objects represent the same calendar day (local time). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

/** Return a Date for N days offset from base (positive = future). */
export function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

// ─── Midnight-spanning entries ───────────────────────────────────────────────

export interface DaySlice {
  date: Date
  startedAt: number
  stoppedAt: number
  durationMs: number
}

/**
 * Split an entry that may span across one or more midnight boundaries.
 * Returns one DaySlice per calendar day that the entry touches.
 *
 * Example: entry from 23:00 → 01:30 the next day returns two slices:
 *   Day 1: 23:00 → 00:00  (60 min)
 *   Day 2: 00:00 → 01:30  (90 min)
 *
 * Entries with a null stoppedAt are treated as ending at `now`.
 */
export function splitAcrossDays(
  startedAt: number,
  stoppedAt: number | null,
  now = Date.now(),
): DaySlice[] {
  const effectiveEnd = stoppedAt ?? now
  if (effectiveEnd <= startedAt) return []

  const slices: DaySlice[] = []
  let cursor = startedAt

  while (cursor < effectiveEnd) {
    const cursorDate = new Date(cursor)
    // Use exclusive midnight boundary so durations sum exactly to (end - start)
    const nextMidnight = endOfDay(cursorDate).getTime() + 1 // 00:00:00.000 next day
    const sliceEnd = Math.min(nextMidnight, effectiveEnd)

    slices.push({
      date: startOfDay(cursorDate),
      startedAt: cursor,
      stoppedAt: sliceEnd,
      durationMs: sliceEnd - cursor,
    })

    cursor = nextMidnight // advance to exact midnight of next day
  }

  return slices
}

// ─── Snap to grid ────────────────────────────────────────────────────────────

/** Round a timestamp to the nearest N-minute boundary. Default: 15 minutes. */
export function snapToGrid(ms: number, gridMinutes = 15): number {
  const gridMs = gridMinutes * MS_PER_MINUTE
  return Math.round(ms / gridMs) * gridMs
}

/** Floor a timestamp to the previous N-minute boundary. */
export function snapFloor(ms: number, gridMinutes = 15): number {
  const gridMs = gridMinutes * MS_PER_MINUTE
  return Math.floor(ms / gridMs) * gridMs
}

/** Ceil a timestamp to the next N-minute boundary. */
export function snapCeil(ms: number, gridMinutes = 15): number {
  const gridMs = gridMinutes * MS_PER_MINUTE
  return Math.ceil(ms / gridMs) * gridMs
}

// ─── Weekly aggregation ──────────────────────────────────────────────────────

export interface DaySummary {
  date: Date
  totalMs: number
  entryCount: number
}

/**
 * Aggregate a flat list of { startedAt, stoppedAt } objects into per-day totals.
 * Handles midnight-spanning entries by splitting them across days.
 */
export function aggregateByDay(
  entries: Array<{ startedAt: number; stoppedAt: number | null }>,
  now = Date.now(),
): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>()

  for (const entry of entries) {
    const slices = splitAcrossDays(entry.startedAt, entry.stoppedAt, now)
    for (const slice of slices) {
      const key = slice.date.toISOString().slice(0, 10) // "YYYY-MM-DD"
      const existing = map.get(key)
      if (existing) {
        existing.totalMs += slice.durationMs
        existing.entryCount++
      } else {
        map.set(key, { date: slice.date, totalMs: slice.durationMs, entryCount: 1 })
      }
    }
  }

  return map
}

import { db } from './database'
import type { TimeEntry, CompletedEntry, RunningEntry } from './schema'
import { isRunning } from './schema'

function newId(): string {
  return crypto.randomUUID()
}

export const EntriesRepository = {
  /** Start a new running entry (stoppedAt = null). */
  async start(tagIds: string[] = [], notes = ''): Promise<TimeEntry> {
    const now = Date.now()
    const entry: TimeEntry = {
      id: newId(),
      startedAt: now,
      stoppedAt: null,
      tagIds,
      notes,
      createdAt: now,
      updatedAt: now,
    }
    await db.entries.add(entry)
    return entry
  },

  /** Stop the currently running entry (if any). Returns the completed entry or null. */
  async stop(id: string): Promise<CompletedEntry | null> {
    const entry = await db.entries.get(id)
    if (!entry || !isRunning(entry)) return null
    const now = Date.now()
    const updated: CompletedEntry = { ...entry, stoppedAt: now, updatedAt: now }
    await db.entries.put(updated)
    return updated
  },

  /** Return the single running entry, or null.
   *  Uses a collection scan because IndexedDB cannot index null values.
   *  This is acceptable — at most one entry is running at any time.
   */
  async getRunning(): Promise<RunningEntry | null> {
    const all = await db.entries.toArray()
    const running = all.find((e) => e.stoppedAt === null)
    return (running as RunningEntry | undefined) ?? null
  },

  /** All entries for a calendar day (local time), newest first. */
  async getByDay(date: Date): Promise<TimeEntry[]> {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    return db.entries
      .where('startedAt')
      .between(start.getTime(), end.getTime(), true, true)
      .reverse()
      .toArray()
  },

  /** All entries whose startedAt falls within [fromMs, toMs]. */
  async getRange(fromMs: number, toMs: number): Promise<TimeEntry[]> {
    return db.entries
      .where('startedAt')
      .between(fromMs, toMs, true, true)
      .reverse()
      .toArray()
  },

  /** Update mutable fields of an entry. */
  async update(id: string, patch: Partial<Pick<TimeEntry, 'startedAt' | 'stoppedAt' | 'tagIds' | 'notes'>>): Promise<void> {
    await db.entries.update(id, { ...patch, updatedAt: Date.now() })
  },

  /** Delete an entry by id. */
  async delete(id: string): Promise<void> {
    await db.entries.delete(id)
  },

  /** Return total tracked ms across all entries in a date range. */
  async totalMsInRange(fromMs: number, toMs: number): Promise<number> {
    const entries = await EntriesRepository.getRange(fromMs, toMs)
    return entries.reduce((sum, e) => {
      if (e.stoppedAt === null) return sum
      return sum + (e.stoppedAt - e.startedAt)
    }, 0)
  },

  /** Export all entries as a plain array (for backup). */
  async exportAll(): Promise<TimeEntry[]> {
    return db.entries.orderBy('startedAt').toArray()
  },

  /** Replace all entries (used during restore). Wraps in a transaction. */
  async importAll(entries: TimeEntry[]): Promise<void> {
    await db.transaction('rw', db.entries, async () => {
      await db.entries.clear()
      await db.entries.bulkAdd(entries)
    })
  },
}

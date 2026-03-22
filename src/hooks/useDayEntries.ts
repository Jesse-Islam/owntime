/**
 * Loads and live-syncs time entries for a given calendar day.
 * Re-fetches whenever the date changes or after mutations.
 */
import { useState, useEffect, useCallback } from 'react'
import { EntriesRepository } from '../db/EntriesRepository'
import { TagsRepository } from '../db/TagsRepository'
import type { TimeEntry, Tag } from '../db/schema'

export interface DayEntriesResult {
  entries: TimeEntry[]
  tags: Map<string, Tag>
  isLoading: boolean
  reload: () => void
}

export function useDayEntries(date: Date): DayEntriesResult {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [tags, setTags] = useState<Map<string, Tag>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [rev, setRev] = useState(0)

  const reload = useCallback(() => setRev((r) => r + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      EntriesRepository.getByDay(date),
      TagsRepository.getAll(),
    ]).then(([dayEntries, allTags]) => {
      if (cancelled) return
      setEntries(dayEntries)
      setTags(new Map(allTags.map((t) => [t.id, t])))
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [date.toDateString(), rev]) // eslint-disable-line react-hooks/exhaustive-deps

  return { entries, tags, isLoading, reload }
}

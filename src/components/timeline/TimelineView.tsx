/**
 * TimelineView — scroll container + entry blocks.
 * Interactions:
 *   - Click entry  → select it (shows editor panel below)
 *   - Drag entry   → move (handled inside EntryBlock)
 *   - Drag handle  → resize (handled inside EntryBlock)
 *   - Click empty  → create 1-hour block, snap to grid, select it
 */
import { useRef, useState, useCallback, useEffect, type MouseEvent } from 'react'
import { EntriesRepository } from '../../db/EntriesRepository'
import { snapFloor } from '../../engine/timeEngine'
import { TimelineGrid, HOUR_HEIGHT_PX, PX_PER_MS, TOTAL_HEIGHT_PX } from './TimelineGrid'
import { EntryBlock } from './EntryBlock'
import { EntryEditorPanel } from './EntryEditorPanel'
import { AnimatePresence } from 'framer-motion'
import type { TimeEntry, Tag } from '../../db/schema'

interface TimelineViewProps {
  date: Date
  entries: TimeEntry[]
  tags: Map<string, Tag>
  onMutate: () => void
}

export function TimelineView({ date, entries, tags, onMutate }: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayStartMs = new Date(date).setHours(0, 0, 0, 0)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const suppressNextClick = useRef(false)

  // Scroll to current time on mount / date change
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const targetPx = (mins / 60) * HOUR_HEIGHT_PX - el.clientHeight / 3
    el.scrollTop = Math.max(0, targetPx)
  }, [date.toDateString()]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selectedEntry in sync (null-safe after delete)
  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null

  // Called by EntryBlock before committing a drag or resize
  const onSuppressNextClick = useCallback(() => {
    suppressNextClick.current = true
  }, [])

  // Called by EntryBlock when a drag-to-move is committed
  const onMoveCommit = useCallback(async (id: string, newStartMs: number, newStopMs: number | null) => {
    await EntriesRepository.update(id, { startedAt: newStartMs, stoppedAt: newStopMs })
    onMutate()
  }, [onMutate])

  // Called by EntryBlock when a resize is committed
  const onResizeCommit = useCallback(async (id: string, newStopMs: number) => {
    await EntriesRepository.update(id, { stoppedAt: newStopMs })
    onMutate()
  }, [onMutate])

  // ── Click empty space → create entry ────────────────────────────────────
  const onCanvasClick = useCallback(async (e: MouseEvent<HTMLDivElement>) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }
    if ((e.target as HTMLElement).closest('[data-entry-block]')) return

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const relY = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    const clickedMs = dayStartMs + relY / PX_PER_MS
    const snappedStart = snapFloor(clickedMs)
    const snappedStop = snappedStart + 60 * 60 * 1000

    const newEntry = await EntriesRepository.start([], '')
    await EntriesRepository.update(newEntry.id, {
      startedAt: snappedStart,
      stoppedAt: snappedStop,
    })
    onMutate()
    setTimeout(() => setSelectedId(newEntry.id), 50)
  }, [dayStartMs, onMutate])

  const currentHour = new Date().getHours()

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Scrollable timeline area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
      >
        <div
          className="relative"
          style={{ height: TOTAL_HEIGHT_PX, minHeight: TOTAL_HEIGHT_PX }}
          onClick={onCanvasClick}
        >
          <TimelineGrid currentHour={currentHour} />

          {entries.map((entry) => (
            <EntryBlock
              key={entry.id}
              entry={entry}
              tags={tags}
              dayStartMs={dayStartMs}
              selected={entry.id === selectedId}
              onSelect={setSelectedId}
              onMoveCommit={onMoveCommit}
              onResizeCommit={onResizeCommit}
              onSuppressNextClick={onSuppressNextClick}
            />
          ))}
        </div>
      </div>

      {/* Editor panel — shown at bottom when an entry is selected */}
      <AnimatePresence>
        {selectedEntry && (
          <EntryEditorPanel
            key={selectedEntry.id}
            entry={selectedEntry}
            tags={tags}
            onClose={() => setSelectedId(null)}
            onMutate={onMutate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * TimelineView — scroll container + entry blocks + resize logic.
 * No @dnd-kit. Interactions:
 *   - Click entry  → select it (shows editor panel below)
 *   - Click empty  → create 1-hour block, snap to grid, select it
 *   - Drag bottom handle → resize (pointer-capture, live preview)
 */
import { useRef, useState, useCallback, useEffect, type MouseEvent } from 'react'
import { EntriesRepository } from '../../db/EntriesRepository'
import { snapToGrid, snapFloor } from '../../engine/timeEngine'
import { TimelineGrid, HOUR_HEIGHT_PX, PX_PER_MS, TOTAL_HEIGHT_PX } from './TimelineGrid'
import { EntryBlock } from './EntryBlock'
import { EntryEditorPanel } from './EntryEditorPanel'
import { AnimatePresence } from 'framer-motion'
import type { TimeEntry, Tag } from '../../db/schema'

interface ResizeState {
  entryId: string
  startY: number
  originalStopMs: number
}

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
  const [previewStop, setPreviewStop] = useState<{ id: string; ms: number } | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  // Scroll to current time on mount / date change
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const targetPx = (mins / 60) * HOUR_HEIGHT_PX - el.clientHeight / 3
    el.scrollTop = Math.max(0, targetPx)
  }, [date.toDateString()]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deselect when entries change (e.g. after delete)
  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null

  // ── Pointer move / up on scroll container for resize ──────────────────────
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rs = resizeRef.current
    if (!rs) return
    const deltaY = e.clientY - rs.startY
    const deltaMs = deltaY / PX_PER_MS
    const newStop = rs.originalStopMs + deltaMs
    if (newStop > 0) {
      setPreviewStop({ id: rs.entryId, ms: newStop })
    }
  }, [])

  const onPointerUp = useCallback(async (e: React.PointerEvent<HTMLDivElement>) => {
    const rs = resizeRef.current
    if (!rs) return
    const deltaY = e.clientY - rs.startY
    const deltaMs = deltaY / PX_PER_MS
    const rawStop = rs.originalStopMs + deltaMs
    const snappedStop = snapToGrid(rawStop)

    // Get the entry to ensure stop > start
    const entry = entries.find((en) => en.id === rs.entryId)
    if (entry && snappedStop > entry.startedAt + 5 * 60 * 1000) {
      await EntriesRepository.update(rs.entryId, { stoppedAt: snappedStop })
      onMutate()
    }
    resizeRef.current = null
    setPreviewStop(null)
  }, [entries, onMutate])

  const onResizeStart = useCallback((entryId: string, startY: number, originalStopMs: number) => {
    resizeRef.current = { entryId, startY, originalStopMs }
  }, [])

  // ── Click empty space → create entry ────────────────────────────────────
  const onCanvasClick = useCallback(async (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-entry-block]')) return
    // Don't create during a resize
    if (resizeRef.current) return

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const relY = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    const clickedMs = dayStartMs + relY / PX_PER_MS
    const snappedStart = snapFloor(clickedMs)
    const snappedStop = snappedStart + 60 * 60 * 1000

    // Create, then immediately close with snapped times
    const newEntry = await EntriesRepository.start([], '')
    await EntriesRepository.update(newEntry.id, {
      startedAt: snappedStart,
      stoppedAt: snappedStop,
    })
    onMutate()
    // Select the new entry after reload
    setTimeout(() => setSelectedId(newEntry.id), 50)
  }, [dayStartMs, onMutate])

  const currentHour = new Date().getHours()

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Scrollable timeline area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{ cursor: resizeRef.current ? 'ns-resize' : 'default' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => {
          // Deselect when clicking on the background (handled after canvas click check)
        }}
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
              previewStopMs={previewStop?.id === entry.id ? previewStop.ms : undefined}
              onSelect={setSelectedId}
              onResizeStart={onResizeStart}
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

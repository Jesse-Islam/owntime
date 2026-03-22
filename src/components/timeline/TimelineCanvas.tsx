/**
 * TimelineCanvas — the main DnD context, scroll container, and ghost-block layer.
 * Handles:
 *  - DndContext with PointerSensor + TouchSensor
 *  - Snap-to-15-min grid for drag moves and resize
 *  - Click-on-empty-space to create a new entry
 *  - Scroll-to-current-time on mount
 */
import { useRef, useCallback, useEffect, type MouseEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { EntriesRepository } from '../../db/EntriesRepository'
import { snapToGrid, snapFloor } from '../../engine/timeEngine'
import { TimelineGrid, HOUR_HEIGHT_PX, PX_PER_MS, TOTAL_HEIGHT_PX } from './TimelineGrid'
import { EntryBlock } from './EntryBlock'
import type { TimeEntry, Tag } from '../../db/schema'

interface TimelineCanvasProps {
  date: Date
  entries: TimeEntry[]
  tags: Map<string, Tag>
  onMutate: () => void
}

export function TimelineCanvas({ date, entries, tags, onMutate }: TimelineCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayStartMs = new Date(date).setHours(0, 0, 0, 0)

  // Scroll to current time on mount / date change
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const now = new Date()
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes()
    const targetPx = (minutesSinceMidnight / 60) * HOUR_HEIGHT_PX - el.clientHeight / 3
    el.scrollTop = Math.max(0, targetPx)
  }, [date.toDateString()]) // eslint-disable-line react-hooks/exhaustive-deps

  // DnD sensors: TouchSensor for mobile, PointerSensor for desktop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Drag end: update startedAt / stoppedAt snapped to 15-min grid
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, delta } = event
    const entry = active.data.current?.entry as TimeEntry | undefined
    if (!entry || !delta) return

    const deltaMs = delta.y / PX_PER_MS
    const newStart = snapToGrid(entry.startedAt + deltaMs)
    const duration = entry.stoppedAt !== null ? entry.stoppedAt - entry.startedAt : 0
    const newStop  = entry.stoppedAt !== null ? newStart + duration : null

    await EntriesRepository.update(entry.id, {
      startedAt: newStart,
      stoppedAt: newStop,
    })
    onMutate()
  }, [onMutate])

  // Click on empty canvas to create a new entry (1-hour block, snapped)
  const handleCanvasClick = useCallback(async (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    // Ignore clicks that bubbled from an entry block
    if (target.closest('[data-entry-block]')) return

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const relY = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    const clickedMs = dayStartMs + relY / PX_PER_MS
    const snappedStart = snapFloor(clickedMs)
    const snappedStop  = snappedStart + 60 * 60 * 1000 // default 1 hour

    await EntriesRepository.start([], '')
    // Immediately close it with the snapped times
    const running = await EntriesRepository.getRunning()
    if (running) {
      await EntriesRepository.update(running.id, {
        startedAt: snappedStart,
        stoppedAt: snappedStop,
      })
    }
    onMutate()
  }, [dayStartMs, onMutate])

  // Resize end: snap new stoppedAt
  const handleResizeEnd = useCallback(async (id: string, rawStopMs: number) => {
    const snapped = snapToGrid(rawStopMs)
    await EntriesRepository.update(id, { stoppedAt: snapped })
    onMutate()
  }, [onMutate])

  // Delete entry
  const handleDelete = useCallback(async (id: string) => {
    await EntriesRepository.delete(id)
    onMutate()
  }, [onMutate])

  const currentHour = new Date().getHours()

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{ height: '100%' }}
      >
        {/* Click zone */}
        <div
          className="relative cursor-crosshair"
          style={{ height: TOTAL_HEIGHT_PX }}
          onClick={handleCanvasClick}
        >
          {/* Hour/quarter grid */}
          <TimelineGrid currentHour={currentHour} />

          {/* Entry blocks */}
          {entries.map((entry) => (
            <div key={entry.id} data-entry-block>
              <EntryBlock
                entry={entry}
                tags={tags}
                dayStartMs={dayStartMs}
                onDelete={handleDelete}
                onResizeEnd={handleResizeEnd}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Drag overlay (ghost) */}
      <DragOverlay>
        {/* Visual ghost is handled by opacity on the dragging block */}
        {null}
      </DragOverlay>
    </DndContext>
  )
}

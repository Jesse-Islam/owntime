/**
 * EntryBlock — positioned time entry block in the timeline.
 *
 * Interactions (all self-contained with pointer capture):
 *   Drag body    → move entry (threshold 5px, translateY preview)
 *   Drag handle  → resize (live height preview, snaps on release)
 *   Click body   → select (only if no drag occurred)
 *
 * Calls onSuppressNextClick() before committing any drag/resize so the
 * canvas doesn't misfire a "create new entry" click afterwards.
 */
import { useRef, useState } from 'react'
import { formatDurationCompact, snapToGrid } from '../../engine/timeEngine'
import type { TimeEntry, Tag } from '../../db/schema'
import { PX_PER_MS } from './TimelineGrid'

interface EntryBlockProps {
  entry: TimeEntry
  tags: Map<string, Tag>
  dayStartMs: number
  selected: boolean
  onSelect: (id: string) => void
  onMoveCommit: (id: string, newStartMs: number, newStopMs: number | null) => void
  onResizeCommit: (id: string, newStopMs: number) => void
  onSuppressNextClick: () => void
}

const DRAG_THRESHOLD = 5  // px before a pointer move becomes a drag

export function EntryBlock({
  entry, tags, dayStartMs, selected,
  onSelect, onMoveCommit, onResizeCommit, onSuppressNextClick,
}: EntryBlockProps) {
  // Drag state (for block body)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startY: number; hasMoved: boolean; deltaY: number } | null>(null)

  // Resize state (for bottom handle)
  const [previewStop, setPreviewStop] = useState<number | null>(null)
  const resizeRef = useRef<{ startY: number; originalStop: number } | null>(null)

  const effectiveStop = previewStop ?? entry.stoppedAt ?? Date.now()
  const topPx   = (entry.startedAt - dayStartMs) * PX_PER_MS
  const heightPx = Math.max((effectiveStop - entry.startedAt) * PX_PER_MS, 14)
  const isRunning = entry.stoppedAt === null

  const entryTags = entry.tagIds.map(id => tags.get(id)).filter(Boolean) as Tag[]
  const color = entryTags[0]?.color ?? '#6366f1'
  const duration = formatDurationCompact(effectiveStop - entry.startedAt)

  // ── Drag (block body) ──────────────────────────────────────────────────────
  function onBodyPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Ignore if clicking resize handle
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, hasMoved: false, deltaY: 0 }
  }

  function onBodyPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    const delta = e.clientY - dragRef.current.startY
    dragRef.current.deltaY = delta
    if (Math.abs(delta) >= DRAG_THRESHOLD) {
      dragRef.current.hasMoved = true
      setIsDragging(true)
      setDragOffsetY(delta)
    }
  }

  function onBodyPointerUp(_e: React.PointerEvent<HTMLDivElement>) {
    const dr = dragRef.current
    if (!dr) return
    dragRef.current = null
    setIsDragging(false)
    setDragOffsetY(0)

    if (dr.hasMoved) {
      const deltaMs = dr.deltaY / PX_PER_MS
      const newStart = snapToGrid(entry.startedAt + deltaMs)
      const duration  = entry.stoppedAt !== null ? entry.stoppedAt - entry.startedAt : null
      const newStop   = duration !== null ? newStart + duration : null
      onSuppressNextClick()
      onMoveCommit(entry.id, newStart, newStop)
    } else {
      // Plain click — select
      onSelect(entry.id)
    }
  }

  // ── Resize (bottom handle) ─────────────────────────────────────────────────
  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { startY: e.clientY, originalStop: entry.stoppedAt ?? Date.now() }
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizeRef.current) return
    const delta = e.clientY - resizeRef.current.startY
    const rawStop = resizeRef.current.originalStop + delta / PX_PER_MS
    if (rawStop > entry.startedAt + 5 * 60_000) {
      setPreviewStop(rawStop)
    }
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const rs = resizeRef.current
    if (!rs) return
    resizeRef.current = null
    const delta  = e.clientY - rs.startY
    const rawStop = rs.originalStop + delta / PX_PER_MS
    const snapped = snapToGrid(rawStop)
    setPreviewStop(null)
    if (snapped > entry.startedAt + 5 * 60_000) {
      onSuppressNextClick()
      onResizeCommit(entry.id, snapped)
    }
  }

  return (
    <div
      className="absolute z-10"
      data-entry-block
      style={{
        top: topPx + dragOffsetY,
        left: '3.5rem',
        right: '4px',
        height: heightPx,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.85 : 1,
        transition: isDragging ? 'none' : 'top 0.1s ease, height 0.05s ease',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onBodyPointerMove}
      onPointerUp={onBodyPointerUp}
    >
      <div
        className="relative h-full rounded-md overflow-visible"
        style={{
          backgroundColor: color + (selected ? '28' : '18'),
          border: `1px solid ${color}${selected ? '80' : '40'}`,
          boxShadow: selected
            ? `0 0 0 2px ${color}50, 0 4px 12px ${color}25`
            : isDragging
              ? `0 8px 24px ${color}40`
              : '0 1px 3px rgba(0,0,0,0.12)',
        }}
      >
        {/* Left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md" style={{ backgroundColor: color }} />

        {/* Content */}
        <div className="pl-2.5 pr-2 py-1 h-full flex flex-col justify-center min-w-0 overflow-hidden pointer-events-none">
          <div className="flex items-center gap-1 flex-wrap">
            {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />}
            {entryTags.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                className="text-[10px] font-medium px-1.5 py-px rounded-full leading-tight whitespace-nowrap"
                style={{ backgroundColor: tag.color + '28', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {entryTags.length === 0 && heightPx > 18 && (
              <span className="text-[10px] italic" style={{ color: color + '99' }}>No tags</span>
            )}
          </div>
          {heightPx > 30 && (
            <div className="text-[10px] font-mono mt-0.5 leading-none" style={{ color: color + 'cc' }}>
              {duration}
            </div>
          )}
        </div>

        {/* Resize handle */}
        {!isRunning && (
          <div
            data-resize-handle
            className="absolute bottom-0 left-0 right-0 h-3 flex items-end justify-center pb-0.5 cursor-ns-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
          >
            <div
              className="w-8 h-1 rounded-full opacity-0 group-hover:opacity-100"
              style={{ backgroundColor: color + 'aa' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

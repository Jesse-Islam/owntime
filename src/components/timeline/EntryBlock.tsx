/**
 * EntryBlock — positioned time entry block in the timeline.
 * Click to select. Bottom handle to resize (pointer-capture based).
 * No DnD library — pure pointer events.
 */
import { useRef } from 'react'
import { formatDurationCompact } from '../../engine/timeEngine'
import type { TimeEntry, Tag } from '../../db/schema'
import { PX_PER_MS } from './TimelineGrid'

interface EntryBlockProps {
  entry: TimeEntry
  tags: Map<string, Tag>
  dayStartMs: number
  selected: boolean
  previewStopMs?: number          // set during live resize
  onSelect: (id: string) => void
  onResizeStart: (id: string, startY: number, originalStopMs: number) => void
}

export function EntryBlock({
  entry,
  tags,
  dayStartMs,
  selected,
  previewStopMs,
  onSelect,
  onResizeStart,
}: EntryBlockProps) {
  const effectiveStop = previewStopMs ?? entry.stoppedAt ?? Date.now()
  const topPx = (entry.startedAt - dayStartMs) * PX_PER_MS
  const rawHeight = (effectiveStop - entry.startedAt) * PX_PER_MS
  const heightPx = Math.max(rawHeight, 14)

  const entryTags = entry.tagIds.map((id) => tags.get(id)).filter(Boolean) as Tag[]
  const color = entryTags[0]?.color ?? '#6366f1'
  const duration = formatDurationCompact(effectiveStop - entry.startedAt)
  const isRunning = entry.stoppedAt === null

  const handleRef = useRef<HTMLDivElement>(null)

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    onResizeStart(entry.id, e.clientY, entry.stoppedAt ?? Date.now())
  }

  return (
    <div
      className="absolute z-10 cursor-pointer group"
      style={{ top: topPx, left: '3.5rem', right: '4px', height: heightPx }}
      onClick={(e) => { e.stopPropagation(); onSelect(entry.id) }}
      data-entry-block
    >
      {/* Main block */}
      <div
        className="relative h-full rounded-md overflow-visible transition-shadow"
        style={{
          backgroundColor: color + (selected ? '28' : '18'),
          border: `1px solid ${color}${selected ? '80' : '40'}`,
          boxShadow: selected ? `0 0 0 2px ${color}60, 0 4px 12px ${color}30` : '0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        {/* Left accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
          style={{ backgroundColor: color }}
        />

        {/* Content */}
        <div className="pl-2.5 pr-2 py-1 h-full flex flex-col justify-center min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 flex-wrap">
            {isRunning && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
            )}
            {entryTags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] font-medium px-1.5 py-px rounded-full leading-tight whitespace-nowrap"
                style={{ backgroundColor: tag.color + '28', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {entryTags.length === 0 && heightPx > 18 && (
              <span className="text-[10px] italic" style={{ color: color + 'aa' }}>No tags</span>
            )}
          </div>
          {heightPx > 30 && (
            <div className="text-[10px] font-mono mt-0.5 leading-none" style={{ color: color + 'cc' }}>
              {duration}
            </div>
          )}
        </div>

        {/* Resize handle — only for completed entries */}
        {!isRunning && (
          <div
            ref={handleRef}
            className="absolute bottom-0 left-0 right-0 h-3 flex items-end justify-center pb-0.5 cursor-ns-resize touch-none"
            onPointerDown={onHandlePointerDown}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-8 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: color + 'aa' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

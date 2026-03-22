/**
 * EntryBlock — a single time entry rendered as a positioned block in the timeline.
 * Supports:
 *  - Drag to move (via @dnd-kit useDraggable)
 *  - Resize handle at bottom
 *  - Click to edit (inline edit form)
 */
import { useRef, useState, type PointerEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDurationCompact } from '../../engine/timeEngine'
import type { TimeEntry, Tag } from '../../db/schema'
import { PX_PER_MS } from './TimelineGrid'

interface EntryBlockProps {
  entry: TimeEntry
  tags: Map<string, Tag>
  dayStartMs: number
  onDelete: (id: string) => void
  onResizeEnd: (id: string, newStoppedAt: number) => void
}

export function EntryBlock({ entry, tags, dayStartMs, onDelete, onResizeEnd }: EntryBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const resizingRef = useRef(false)
  const resizeStartY = useRef(0)
  const resizeStartStop = useRef(0)

  // @dnd-kit draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { entry },
  })

  const effectiveStop = entry.stoppedAt ?? Date.now()
  const topPx = (entry.startedAt - dayStartMs) * PX_PER_MS
  const heightPx = Math.max((effectiveStop - entry.startedAt) * PX_PER_MS, 12) // min 12px

  const entryTags = entry.tagIds
    .map((id) => tags.get(id))
    .filter(Boolean) as Tag[]

  const duration = formatDurationCompact(effectiveStop - entry.startedAt)

  // Primary color from first tag, fallback to indigo
  const color = entryTags[0]?.color ?? '#6366f1'

  // Resize pointer events
  const onResizePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizingRef.current = true
    resizeStartY.current = e.clientY
    resizeStartStop.current = entry.stoppedAt ?? Date.now()
  }

  const onResizePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!resizingRef.current) return
    const deltaY = e.clientY - resizeStartY.current
    const deltaMs = deltaY / PX_PER_MS
    // Will be snapped externally; emit raw value and let parent snap
    const newStop = resizeStartStop.current + deltaMs
    if (newStop > entry.startedAt + 60_000) {
      onResizeEnd(entry.id, newStop)
    }
  }

  const onResizePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    resizingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const style = {
    top: topPx,
    height: heightPx,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="absolute left-12 right-1 z-10"
    >
      <motion.div
        layout
        className={`
          relative h-full rounded-md overflow-hidden cursor-pointer
          border transition-shadow
          ${isDragging ? 'shadow-2xl ring-2 ring-indigo-400' : 'shadow-md hover:shadow-lg'}
        `}
        style={{
          backgroundColor: color + '1a',
          borderColor: color + '44',
        }}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
          style={{ backgroundColor: color }}
        />

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3 text-slate-500" />
        </div>

        {/* Content */}
        <div className="pl-5 pr-6 py-1 h-full flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {entryTags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] font-medium truncate px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: tag.color + '33', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {entryTags.length === 0 && (
              <span className="text-[10px] text-slate-500 italic">No tags</span>
            )}
          </div>
          {heightPx > 28 && (
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{duration}</div>
          )}
        </div>

        {/* Delete button */}
        <button
          className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
          aria-label="Delete entry"
          style={{ opacity: isExpanded ? 1 : undefined }}
        >
          <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
        </button>

        {/* Expanded detail */}
        <AnimatePresence>
          {isExpanded && heightPx < 60 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-600/50 rounded-lg p-3 shadow-xl text-xs text-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-mono mb-1">{duration}</div>
              <div className="text-slate-500">
                {new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' → '}
                {entry.stoppedAt
                  ? new Date(entry.stoppedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'running'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resize handle */}
        {entry.stoppedAt !== null && (
          <div
            className="absolute bottom-0 left-1 right-1 h-2 cursor-ns-resize flex items-center justify-center group/resize touch-none"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-600 group-hover/resize:bg-indigo-400 transition-colors" />
          </div>
        )}
      </motion.div>
    </div>
  )
}

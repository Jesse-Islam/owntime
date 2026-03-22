/**
 * EntryEditorPanel — slides up at the bottom of the timeline when an entry is selected.
 * Lets users edit start/end times, tags, notes, and delete.
 */
import { useState, useEffect } from 'react'
import { X, Trash2, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { TagCombobox } from '../TagCombobox'
import { EntriesRepository } from '../../db/EntriesRepository'
import { snapToGrid } from '../../engine/timeEngine'
import type { TimeEntry, Tag } from '../../db/schema'

interface EntryEditorPanelProps {
  entry: TimeEntry
  tags: Map<string, Tag>
  onClose: () => void
  onMutate: () => void
}

/** Format a ms timestamp as HH:MM for <input type="time"> */
function toTimeInput(ms: number): string {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Parse HH:MM from <input type="time"> back into a ms timestamp on a given day */
function fromTimeInput(value: string, dayMs: number): number {
  const [hh, mm] = value.split(':').map(Number)
  const d = new Date(dayMs)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

export function EntryEditorPanel({ entry, tags, onClose, onMutate }: EntryEditorPanelProps) {
  const dayMs = new Date(entry.startedAt).setHours(0, 0, 0, 0)

  const [startInput, setStartInput] = useState(toTimeInput(entry.startedAt))
  const [stopInput, setStopInput] = useState(
    entry.stoppedAt ? toTimeInput(entry.stoppedAt) : ''
  )
  const [tagIds, setTagIds] = useState<string[]>(entry.tagIds)
  const [notes, setNotes] = useState(entry.notes)
  const [dirty, setDirty] = useState(false)

  // Re-sync if the entry changes from outside (e.g. resize)
  useEffect(() => {
    setStartInput(toTimeInput(entry.startedAt))
    setStopInput(entry.stoppedAt ? toTimeInput(entry.stoppedAt) : '')
    setTagIds(entry.tagIds)
    setNotes(entry.notes)
    setDirty(false)
  }, [entry.id, entry.startedAt, entry.stoppedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const allTags = Array.from(tags.values())

  const handleSave = async () => {
    const newStart = snapToGrid(fromTimeInput(startInput, dayMs))
    const newStop = stopInput
      ? snapToGrid(fromTimeInput(stopInput, dayMs))
      : entry.stoppedAt

    // Guard: stop must be after start
    if (newStop !== null && newStop <= newStart) return

    await EntriesRepository.update(entry.id, {
      startedAt: newStart,
      stoppedAt: newStop,
      tagIds,
      notes,
    })
    setDirty(false)
    onMutate()
  }

  const handleDelete = async () => {
    await EntriesRepository.delete(entry.id)
    onMutate()
    onClose()
  }

  const markDirty = () => setDirty(true)

  const primaryColor = tagIds
    .map((id) => tags.get(id)?.color)
    .find(Boolean) ?? 'var(--ot-accent)'

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex-shrink-0 border-t"
      style={{ backgroundColor: 'var(--ot-surface)', borderColor: 'var(--ot-border)' }}
    >
      {/* Color accent stripe */}
      <div className="h-0.5 w-full" style={{ backgroundColor: primaryColor }} />

      <div className="px-4 py-3 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold ot-muted uppercase tracking-wide">Edit entry</span>
          <div className="flex items-center gap-1">
            {dirty && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-white transition-colors"
                style={{ backgroundColor: 'var(--ot-accent)' }}
              >
                <Check className="w-3 h-3" /> Save
              </button>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--ot-danger)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ot-surface2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              aria-label="Delete entry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors ot-faint"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ot-surface2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              aria-label="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Time row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <label className="text-[10px] ot-faint uppercase tracking-wide w-8">Start</label>
            <input
              type="time"
              value={startInput}
              onChange={(e) => { setStartInput(e.target.value); markDirty() }}
              onBlur={handleSave}
              className="flex-1 text-sm font-mono rounded-md px-2 py-1.5 border outline-none focus:ring-1 transition-colors"
              style={{
                backgroundColor: 'var(--ot-surface2)',
                borderColor: 'var(--ot-border)',
                color: 'var(--ot-text)',
              }}
            />
          </div>
          <span className="ot-faint text-sm">→</span>
          <div className="flex items-center gap-1.5 flex-1">
            <label className="text-[10px] ot-faint uppercase tracking-wide w-8">End</label>
            <input
              type="time"
              value={stopInput}
              onChange={(e) => { setStopInput(e.target.value); markDirty() }}
              onBlur={handleSave}
              disabled={entry.stoppedAt === null}
              placeholder="running"
              className="flex-1 text-sm font-mono rounded-md px-2 py-1.5 border outline-none focus:ring-1 transition-colors disabled:opacity-40"
              style={{
                backgroundColor: 'var(--ot-surface2)',
                borderColor: 'var(--ot-border)',
                color: 'var(--ot-text)',
              }}
            />
          </div>
        </div>

        {/* Tags row */}
        <TagCombobox
          selectedTagIds={tagIds}
          allTags={allTags}
          onChange={(ids) => { setTagIds(ids); setDirty(true) }}
          placeholder="Add tags…"
        />
      </div>
    </motion.div>
  )
}

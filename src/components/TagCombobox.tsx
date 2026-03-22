/**
 * Reusable tag combobox — used in ActionBar and EntryEditorPanel.
 * Supports select existing, create new, remove from entry, delete from system.
 * Always loads tags fresh from the DB on mount/open.
 */
import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { Tag, X, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { TagsRepository } from '../db/TagsRepository'
import type { Tag as TagType } from '../db/schema'

interface TagComboboxProps {
  selectedTagIds: string[]
  onChange: (ids: string[]) => void
  onTagsChanged?: (tags: TagType[]) => void
  placeholder?: string
  className?: string
}

export function TagCombobox({
  selectedTagIds,
  onChange,
  onTagsChanged,
  placeholder = 'Add tags…',
  className = '',
}: TagComboboxProps) {
  const [allTags, setAllTags] = useState<TagType[]>([])
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadTags = useCallback(async () => {
    const tags = await TagsRepository.getAll()
    setAllTags(tags)
    return tags
  }, [])

  // Load tags on mount and whenever the dropdown opens
  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    if (open) loadTags()
  }, [open, loadTags])

  // Close on outside click
  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (
        menuRef.current?.contains(e.target as Node) ||
        inputRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const filtered = allTags.filter(
    (t) =>
      t.name.toLowerCase().includes(input.toLowerCase()) &&
      !selectedTagIds.includes(t.id),
  )

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id))

  const addTag = (tag: TagType) => {
    onChange([...selectedTagIds, tag.id])
    setInput('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const removeTag = (id: string) => {
    onChange(selectedTagIds.filter((x) => x !== id))
  }

  const createTag = async () => {
    if (!input.trim()) return
    const tag = await TagsRepository.upsert(input.trim())
    const updated = await loadTags()
    onTagsChanged?.(updated)
    addTag(tag)
  }

  const deleteTagFromSystem = async (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation()
    await TagsRepository.delete(tagId)
    const updated = await loadTags()
    onTagsChanged?.(updated)
    // Remove from current selection if present
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((x) => x !== tagId))
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) addTag(filtered[0])
      else createTag()
    }
    if (e.key === 'Escape') { setOpen(false); setInput('') }
    if (e.key === 'Backspace' && input === '' && selectedTagIds.length > 0) {
      removeTag(selectedTagIds[selectedTagIds.length - 1])
    }
  }

  const showMenu = open && (input.length > 0 || filtered.length > 0 || allTags.length > 0)

  return (
    <div
      className={`relative flex items-center gap-1.5 flex-wrap min-h-[2.5rem] px-3 py-1.5 rounded-lg border transition-colors ${className}`}
      style={{
        backgroundColor: 'var(--ot-surface2)',
        borderColor: open ? 'var(--ot-accent)' : 'var(--ot-border)',
      }}
    >
      <Tag className="w-3.5 h-3.5 flex-shrink-0 ot-faint" />

      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: tag.color + '28', color: tag.color }}
        >
          {tag.name}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); removeTag(tag.id) }}
            className="hover:opacity-70 transition-opacity"
            aria-label={`Remove ${tag.name}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={selectedTagIds.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[70px] bg-transparent text-sm outline-none placeholder:ot-faint"
        style={{ color: 'var(--ot-text)' }}
      />

      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg shadow-xl overflow-hidden border"
            style={{ backgroundColor: 'var(--ot-surface)', borderColor: 'var(--ot-border)' }}
          >
            {filtered.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-3 py-2 text-sm transition-colors group"
                style={{ color: 'var(--ot-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ot-surface2)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); addTag(tag) }}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => deleteTagFromSystem(e, tag.id)}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded"
                  style={{ color: 'var(--ot-danger)' }}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {/* Show all tags (already selected ones too) when no input, for delete access */}
            {input === '' && filtered.length === 0 && allTags.filter(t => selectedTagIds.includes(t.id)).map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-3 py-2 text-sm transition-colors group opacity-50"
                style={{ color: 'var(--ot-text)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ot-surface2)'; e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.opacity = '0.5' }}
              >
                <span className="flex items-center gap-2 flex-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  <span className="text-[10px] ot-faint">(selected)</span>
                </span>
                <button
                  type="button"
                  onPointerDown={(e) => deleteTagFromSystem(e, tag.id)}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded"
                  style={{ color: 'var(--ot-danger)' }}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {input.trim() && !allTags.some((t) => t.name.toLowerCase() === input.toLowerCase()) && (
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); createTag() }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors border-t"
                style={{ borderColor: 'var(--ot-border)', color: 'var(--ot-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ot-surface2)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <span style={{ color: 'var(--ot-accent-text)' }} className="font-medium">+ Create</span>
                <span className="ot-muted">"{input}"</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

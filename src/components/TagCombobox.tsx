/**
 * Reusable tag combobox — used in ActionBar and EntryEditorPanel.
 * Supports select existing, create new, remove, keyboard navigation.
 */
import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Tag, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { TagsRepository } from '../db/TagsRepository'
import type { Tag as TagType } from '../db/schema'

interface TagComboboxProps {
  selectedTagIds: string[]
  onChange: (ids: string[]) => void
  /** Supply if you want the component to manage its own tag list internally */
  allTags?: TagType[]
  onTagsChanged?: (tags: TagType[]) => void
  placeholder?: string
  className?: string
}

export function TagCombobox({
  selectedTagIds,
  onChange,
  allTags: allTagsProp,
  onTagsChanged,
  placeholder = 'Add tags…',
  className = '',
}: TagComboboxProps) {
  const [allTags, setAllTags] = useState<TagType[]>(allTagsProp ?? [])
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load tags if not provided externally
  useEffect(() => {
    if (!allTagsProp) {
      TagsRepository.getAll().then(setAllTags)
    }
  }, [allTagsProp])

  // Sync when external tags prop changes
  useEffect(() => {
    if (allTagsProp) setAllTags(allTagsProp)
  }, [allTagsProp])

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
    const updated = await TagsRepository.getAll()
    setAllTags(updated)
    onTagsChanged?.(updated)
    addTag(tag)
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

  const showMenu = open && (input.length > 0 || filtered.length > 0)

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
            onClick={() => removeTag(tag.id)}
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
              <button
                key={tag.id}
                type="button"
                onPointerDown={(e) => { e.preventDefault(); addTag(tag) }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                style={{ color: 'var(--ot-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ot-surface2)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
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

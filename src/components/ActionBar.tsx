/**
 * ActionBar — the global floating timer control strip.
 * Desktop: fixed to top. Mobile: floats above the bottom nav.
 * Contains the Play/Stop toggle and a tag combobox.
 */
import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Play, Square, Tag, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTimer } from '../store/timerStore'
import { TagsRepository } from '../db/TagsRepository'
import { formatDuration } from '../engine/timeEngine'
import type { Tag as TagType } from '../db/schema'

export function ActionBar() {
  const { state, startTimer, stopTimer } = useTimer()
  const { runningEntry, elapsedMs: elapsed, isLoading } = state

  const [tags, setTags] = useState<TagType[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagMenu, setShowTagMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load all tags
  useEffect(() => {
    TagsRepository.getAll().then(setTags)
  }, [])

  // Close menu on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowTagMenu(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Space hotkey: toggle timer (when no input focused)
  useHotkeys('space', (e) => {
    if (document.activeElement?.tagName === 'INPUT') return
    e.preventDefault()
    handleToggle()
  }, { enableOnFormTags: false })

  const handleToggle = async () => {
    if (runningEntry) {
      await stopTimer()
      setSelectedTagIds([])
    } else {
      await startTimer(selectedTagIds)
    }
  }

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTagIds.includes(t.id),
  )

  const selectTag = (tag: TagType) => {
    setSelectedTagIds((ids) => [...ids, tag.id])
    setTagInput('')
    setShowTagMenu(false)
    inputRef.current?.focus()
  }

  const createAndSelectTag = async () => {
    if (!tagInput.trim()) return
    const tag = await TagsRepository.upsert(tagInput.trim())
    setTags(await TagsRepository.getAll())
    selectTag(tag)
  }

  const removeTag = (id: string) => setSelectedTagIds((ids) => ids.filter((x) => x !== id))

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filteredTags.length > 0) selectTag(filteredTags[0])
      else createAndSelectTag()
    }
    if (e.key === 'Escape') {
      setShowTagMenu(false)
      setTagInput('')
    }
    if (e.key === 'Backspace' && tagInput === '' && selectedTagIds.length > 0) {
      removeTag(selectedTagIds[selectedTagIds.length - 1])
    }
  }

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))
  const { display } = formatDuration(elapsed)

  return (
    <div className="fixed top-0 left-0 right-0 z-40 md:left-64 safe-top">
      <div className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">

          {/* Play/Stop button */}
          <motion.button
            onClick={handleToggle}
            disabled={isLoading}
            whileTap={{ scale: 0.92 }}
            className={`
              flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
              shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
              ${runningEntry
                ? 'bg-red-500 hover:bg-red-400 shadow-red-500/30 focus-visible:ring-red-500'
                : 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/30 focus-visible:ring-indigo-500'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label={runningEntry ? 'Stop timer' : 'Start timer'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {runningEntry ? (
                <motion.span key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Square className="w-5 h-5 text-white fill-white" />
                </motion.span>
              ) : (
                <motion.span key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Elapsed display (only when running) */}
          <AnimatePresence>
            {runningEntry && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-mono text-lg font-medium text-slate-100 tabular-nums overflow-hidden whitespace-nowrap"
              >
                {display}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tag combobox */}
          {!runningEntry && (
            <div className="flex-1 relative flex items-center gap-1.5 flex-wrap min-h-[2.5rem] px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/50 focus-within:border-indigo-500/70 transition-colors">
              <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />

              {/* Selected tag pills */}
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color + '33', color: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => removeTag(tag.id)}
                    className="hover:opacity-70 transition-opacity"
                    aria-label={`Remove ${tag.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Text input */}
              <input
                ref={inputRef}
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value)
                  setShowTagMenu(true)
                }}
                onFocus={() => setShowTagMenu(true)}
                onKeyDown={handleTagKeyDown}
                placeholder={selectedTagIds.length === 0 ? 'Add tags…' : ''}
                className="flex-1 min-w-[80px] bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
              />

              {/* Dropdown */}
              <AnimatePresence>
                {showTagMenu && (tagInput || filteredTags.length > 0) && (
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl overflow-hidden"
                  >
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        onPointerDown={(e) => { e.preventDefault(); selectTag(tag) }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-slate-200">{tag.name}</span>
                      </button>
                    ))}
                    {tagInput.trim() && !tags.some((t) => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                      <button
                        onPointerDown={(e) => { e.preventDefault(); createAndSelectTag() }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors border-t border-slate-700/50"
                      >
                        <span className="text-indigo-400 font-medium">+ Create</span>
                        <span className="text-slate-300">"{tagInput}"</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Running entry tag pills (read-only while running) */}
          {runningEntry && selectedTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color + '33', color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * ActionBar — global floating timer strip.
 * Tags are editable both before AND while the timer is running.
 */
import { useState, useEffect, useCallback } from 'react'
import { Play, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTimer } from '../store/timerStore'
import { EntriesRepository } from '../db/EntriesRepository'
import { formatDuration } from '../engine/timeEngine'
import { DataHealth } from './DataHealth'
import { TagCombobox } from './TagCombobox'
import { useUndo } from './UndoToast'

export function ActionBar() {
  const { state, startTimer, stopTimer } = useTimer()
  const { runningEntry, elapsedMs: elapsed, isLoading } = state
  const { showUndo } = useUndo()

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Sync local tag selection when a running entry loads (e.g. on page refresh)
  useEffect(() => {
    if (runningEntry) {
      setSelectedTagIds(runningEntry.tagIds)
    } else {
      setSelectedTagIds([])
    }
  }, [runningEntry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTagChange = useCallback(async (ids: string[]) => {
    setSelectedTagIds(ids)
    // If running, persist tag change to the DB immediately
    if (runningEntry) {
      await EntriesRepository.update(runningEntry.id, { tagIds: ids })
    }
  }, [runningEntry])

  const handleToggle = useCallback(async () => {
    if (runningEntry) {
      const snapshot = { ...runningEntry }
      await stopTimer()
      setSelectedTagIds([])
      showUndo('Timer stopped', async () => {
        // Restore running state — update the stopped entry back to running
        await EntriesRepository.update(snapshot.id, { stoppedAt: null })
        setSelectedTagIds(snapshot.tagIds)
      })
    } else {
      await startTimer(selectedTagIds)
    }
  }, [runningEntry, stopTimer, startTimer, selectedTagIds, showUndo])

  useHotkeys('space', (e) => {
    if (document.activeElement?.tagName === 'INPUT') return
    e.preventDefault()
    handleToggle()
  }, { enableOnFormTags: false }, [handleToggle])

  const { display } = formatDuration(elapsed)

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 md:left-64 safe-top"
      style={{ borderBottom: '1px solid var(--ot-border)' }}
    >
      <div
        className="backdrop-blur-sm px-3 py-2"
        style={{ backgroundColor: 'color-mix(in srgb, var(--ot-surface) 96%, transparent)' }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">

          <DataHealth />

          {/* Play / Stop */}
          <motion.button
            onClick={handleToggle}
            disabled={isLoading}
            whileTap={{ scale: 0.92 }}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: runningEntry ? 'var(--ot-danger)' : 'var(--ot-accent)',
              boxShadow: `0 4px 14px ${runningEntry ? 'var(--ot-danger)' : 'var(--ot-accent)'}40`,
              '--tw-ring-offset-color': 'var(--ot-surface)',
              '--tw-ring-color': runningEntry ? 'var(--ot-danger)' : 'var(--ot-accent)',
            } as React.CSSProperties}
            aria-label={runningEntry ? 'Stop timer' : 'Start timer'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {runningEntry ? (
                <motion.span key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Square className="w-4 h-4 text-white fill-white" />
                </motion.span>
              ) : (
                <motion.span key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Elapsed clock (visible when running) */}
          <AnimatePresence>
            {runningEntry && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-mono text-base font-semibold tabular-nums overflow-hidden whitespace-nowrap flex-shrink-0"
                style={{ color: 'var(--ot-text)' }}
              >
                {display}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tag combobox — always visible, editable before and during tracking */}
          <div className="flex-1 min-w-0">
            <TagCombobox
              selectedTagIds={selectedTagIds}
              onChange={handleTagChange}
              placeholder={runningEntry ? 'Add tags to this session…' : 'Add tags, then press ▶'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

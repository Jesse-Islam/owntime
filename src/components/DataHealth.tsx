/**
 * DataHealth — a compact status indicator + backup control panel.
 *
 * Shows:
 *  - Green dot: last backup was < 30 min ago
 *  - Yellow dot: last backup was > 30 min ago
 *  - Red dot: never backed up / error
 *
 * Controls:
 *  - "Set auto-sync folder" (if FS API supported)
 *  - "Export JSON" (always available fallback)
 *  - "Import / Restore" (file picker)
 */
import { useState, useRef, useCallback, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, FolderOpen, Download, Upload, X, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { useBackup } from '../hooks/useBackup'
import { restoreFromPayload, parseBackupJson } from '../utils/backup'

const STALE_MS = 30 * 60 * 1000 // 30 min

function healthColor(lastBackupAt: number | null, status: string): 'green' | 'yellow' | 'red' {
  if (status === 'error') return 'red'
  if (!lastBackupAt) return 'red'
  if (Date.now() - lastBackupAt < STALE_MS) return 'green'
  return 'yellow'
}

export function DataHealth() {
  const backup = useBackup()
  const [open, setOpen] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const color = healthColor(backup.lastBackupAt, backup.status)

  const dotClass = {
    green:  'bg-green-500',
    yellow: 'bg-yellow-500',
    red:    'bg-red-500',
  }[color]

  const lastBackupLabel = backup.lastBackupAt
    ? `Last: ${new Date(backup.lastBackupAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Never backed up'

  const handleImportFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = parseBackupJson(text)
      await restoreFromPayload(payload)
      setRestoreError(null)
      setOpen(false)
      window.location.reload() // full reload to sync all state
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      e.target.value = ''
    }
  }, [])

  return (
    <div className="relative">
      {/* Status pill button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/60 hover:bg-slate-700 border border-slate-600/40 transition-colors text-xs font-medium text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Data health and backup"
      >
        <span className="relative flex-shrink-0">
          <span className={`block w-2 h-2 rounded-full ${dotClass}`} />
          {color === 'green' && (
            <span className={`absolute inset-0 rounded-full ${dotClass} animate-ping opacity-50`} />
          )}
        </span>
        <HardDrive className="w-3.5 h-3.5" />
        <span className="hidden sm:block">Data</span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
                  <span className="text-sm font-semibold text-slate-100">Data Health</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Status line */}
                <div className="flex items-center gap-2">
                  {backup.status === 'syncing' ? (
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                  ) : color === 'green' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      {backup.status === 'syncing' ? 'Syncing…' : lastBackupLabel}
                    </div>
                    {backup.errorMessage && (
                      <div className="text-[10px] text-red-400 mt-0.5">{backup.errorMessage}</div>
                    )}
                    {backup.dirHandle && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Auto-sync every 15 min → {backup.dirHandle.name}/
                      </div>
                    )}
                  </div>
                </div>

                {/* Tier 1: FS API */}
                {backup.hasFsAccess && (
                  <div className="space-y-2">
                    {backup.dirHandle ? (
                      <button
                        onClick={backup.forgetDirectory}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                        Disable auto-sync
                      </button>
                    ) : (
                      <button
                        onClick={backup.pickDirectory}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-700/50 transition-colors border border-slate-600/40"
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                        Enable auto-sync to folder
                      </button>
                    )}
                  </div>
                )}

                {/* Tier 2: Manual export */}
                <button
                  onClick={() => { backup.triggerManualBackup(); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-700/50 transition-colors border border-slate-600/40"
                >
                  <Download className="w-4 h-4 flex-shrink-0 text-green-400" />
                  Export data as JSON
                </button>

                {/* Restore */}
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-700/50 transition-colors border border-slate-600/40"
                  >
                    <Upload className="w-4 h-4 flex-shrink-0 text-yellow-400" />
                    Restore from backup
                  </button>
                  {restoreError && (
                    <p className="text-[10px] text-red-400 mt-1 px-1">{restoreError}</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFile}
                    className="sr-only"
                  />
                </div>

                <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                  All data is stored locally in your browser's IndexedDB.
                  Backups are plain JSON — fully portable.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

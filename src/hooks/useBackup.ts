/**
 * useBackup — drives the backup engine and surfaces status to the UI.
 *
 * - On mount: loads lastBackupAt, attempts to re-acquire the saved dir handle.
 * - If handle is valid: schedules auto-backup every BACKUP_INTERVAL_MS.
 * - Exposes: lastBackupAt, dirHandle, pickDirectory, triggerManualBackup, status
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  isFileSystemAccessSupported,
  pickBackupDirectory,
  getBackupDirectory,
  writeAutoBackup,
  downloadBackup,
  BACKUP_INTERVAL_MS,
} from '../utils/backup'
import { SettingsRepository } from '../db/SettingsRepository'

export type BackupStatus = 'idle' | 'syncing' | 'ok' | 'error'

export interface BackupState {
  lastBackupAt: number | null
  dirHandle: FileSystemDirectoryHandle | null
  status: BackupStatus
  errorMessage: string | null
  hasFsAccess: boolean
}

export interface BackupActions {
  pickDirectory: () => Promise<void>
  triggerManualBackup: () => Promise<void>
  forgetDirectory: () => Promise<void>
}

export function useBackup(): BackupState & BackupActions {
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null)
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [status, setStatus] = useState<BackupStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const performAutoBackup = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setStatus('syncing')
    try {
      const ts = await writeAutoBackup(handle)
      setLastBackupAt(ts)
      setStatus('ok')
      setErrorMessage(null)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Auto-backup failed')
    }
  }, [])

  const scheduleAutoBackup = useCallback((handle: FileSystemDirectoryHandle) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    // Run immediately, then on interval
    performAutoBackup(handle)
    intervalRef.current = setInterval(() => performAutoBackup(handle), BACKUP_INTERVAL_MS)
  }, [performAutoBackup])

  // On mount: load persisted state
  useEffect(() => {
    SettingsRepository.get<number>('lastBackupAt').then((ts) => {
      if (ts) setLastBackupAt(ts)
    })

    if (isFileSystemAccessSupported()) {
      getBackupDirectory().then((handle) => {
        if (handle) {
          setDirHandle(handle)
          scheduleAutoBackup(handle)
        }
      })
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [scheduleAutoBackup])

  const pickDirectory = useCallback(async () => {
    const handle = await pickBackupDirectory()
    if (handle) {
      setDirHandle(handle)
      scheduleAutoBackup(handle)
    }
  }, [scheduleAutoBackup])

  const triggerManualBackup = useCallback(async () => {
    setStatus('syncing')
    try {
      await downloadBackup()
      setStatus('ok')
      setErrorMessage(null)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Export failed')
    }
  }, [])

  const forgetDirectory = useCallback(async () => {
    await SettingsRepository.delete('backupDirHandle')
    await SettingsRepository.delete('lastBackupAt')
    setDirHandle(null)
    setLastBackupAt(null)
    setStatus('idle')
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return {
    lastBackupAt,
    dirHandle,
    status,
    errorMessage,
    hasFsAccess: isFileSystemAccessSupported(),
    pickDirectory,
    triggerManualBackup,
    forgetDirectory,
  }
}

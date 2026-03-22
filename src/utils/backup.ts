/**
 * Backup Engine — tiered data-sovereignty strategy.
 *
 * Tier 1 (showDirectoryPicker supported):
 *   - Auto-sync writes a JSON heartbeat every 15 minutes to a user-chosen folder.
 *   - The FileSystemDirectoryHandle is persisted in IndexedDB via SettingsRepository.
 *
 * Tier 2 (fallback):
 *   - Manual "Export Data" triggers a JSON download via <a download>.
 */
import { EntriesRepository } from '../db/EntriesRepository'
import { TagsRepository } from '../db/TagsRepository'
import { SettingsRepository } from '../db/SettingsRepository'

export const BACKUP_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export interface BackupPayload {
  version: 1
  exportedAt: number
  entries: Awaited<ReturnType<typeof EntriesRepository.exportAll>>
  tags: Awaited<ReturnType<typeof TagsRepository.exportAll>>
  settings: Awaited<ReturnType<typeof SettingsRepository.exportAll>>
}

async function buildPayload(): Promise<BackupPayload> {
  const [entries, tags, settings] = await Promise.all([
    EntriesRepository.exportAll(),
    TagsRepository.exportAll(),
    SettingsRepository.exportAll(),
  ])
  return { version: 1, exportedAt: Date.now(), entries, tags, settings }
}

// ─── Tier 1: File System Access API ─────────────────────────────────────────

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Prompt the user to pick a backup directory and persist the handle.
 * Returns the handle or null if the user cancelled / permission denied.
 */
export async function pickBackupDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null
  try {
    // @ts-expect-error — showDirectoryPicker is not yet in all TS lib versions
    const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    await SettingsRepository.set('backupDirHandle', handle)
    return handle
  } catch {
    // User cancelled
    return null
  }
}

/**
 * Retrieve the persisted directory handle (if any) and re-verify permission.
 */
export async function getBackupDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await SettingsRepository.get<FileSystemDirectoryHandle>('backupDirHandle')
  if (!handle) return null
  try {
    // queryPermission / requestPermission are not yet in all TS DOM lib versions
    const h = handle as FileSystemDirectoryHandle & {
      queryPermission(desc: { mode: string }): Promise<string>
      requestPermission(desc: { mode: string }): Promise<string>
    }
    const perm = await h.queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') return handle
    const req = await h.requestPermission({ mode: 'readwrite' })
    return req === 'granted' ? handle : null
  } catch {
    return null
  }
}

/**
 * Write a backup JSON to the directory. File name: owntime-backup-YYYY-MM-DD.json
 * Updates lastBackupAt on success.
 */
export async function writeAutoBackup(dirHandle: FileSystemDirectoryHandle): Promise<number> {
  const payload = await buildPayload()
  const date = new Date(payload.exportedAt).toISOString().slice(0, 10)
  const fileName = `owntime-backup-${date}.json`

  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(payload, null, 2))
  await writable.close()

  await SettingsRepository.set('lastBackupAt', payload.exportedAt)
  return payload.exportedAt
}

// ─── Tier 2: Manual JSON download ───────────────────────────────────────────

/**
 * Trigger a browser download of the full backup JSON.
 */
export async function downloadBackup(): Promise<void> {
  const payload = await buildPayload()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date(payload.exportedAt).toISOString().slice(0, 10)

  const a = document.createElement('a')
  a.href = url
  a.download = `owntime-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Restore from a BackupPayload (parsed JSON).
 * Replaces all entries, tags, and settings in the DB.
 */
export async function restoreFromPayload(payload: BackupPayload): Promise<void> {
  await EntriesRepository.importAll(payload.entries)
  await TagsRepository.importAll(payload.tags)
  // Restore settings selectively (skip backupDirHandle — not serialisable)
  for (const [key, value] of Object.entries(payload.settings)) {
    if (key !== 'backupDirHandle') {
      await SettingsRepository.set(key as Parameters<typeof SettingsRepository.set>[0], value)
    }
  }
}

/**
 * Erase all entries and tags from the database.
 * Preserves settings (theme, etc.) so the app stays configured.
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    EntriesRepository.importAll([]),
    TagsRepository.importAll([]),
  ])
}

/**
 * Parse and validate a JSON string as a BackupPayload.
 * Throws if the payload is not recognised.
 */
export function parseBackupJson(json: string): BackupPayload {
  const data = JSON.parse(json) as Partial<BackupPayload>
  if (data.version !== 1 || !Array.isArray(data.entries) || !Array.isArray(data.tags)) {
    throw new Error('Invalid backup file format.')
  }
  return data as BackupPayload
}

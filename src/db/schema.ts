/**
 * OwnTime Database Schema
 *
 * All timestamps are Unix milliseconds (Date.now()).
 * IDs are crypto.randomUUID() strings.
 */

export interface TimeEntry {
  id: string
  startedAt: number        // ms timestamp
  stoppedAt: number | null // null = currently running
  tagIds: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: string
  name: string             // user-visible label
  color: string            // hex color e.g. "#6366f1"
  createdAt: number
}

export interface Settings {
  key: string              // primary key
  value: unknown
}

/** Well-known settings keys */
export type SettingsKey =
  | 'backupDirHandle'      // FileSystemDirectoryHandle (persisted via indexedDB)
  | 'lastBackupAt'         // number timestamp
  | 'backupIntervalMs'     // number (default 15 min)
  | 'theme'                // 'dark' (only option for now)

/** Derived type: a running entry always has stoppedAt = null */
export type RunningEntry = TimeEntry & { stoppedAt: null }
export type CompletedEntry = TimeEntry & { stoppedAt: number }

export function isRunning(entry: TimeEntry): entry is RunningEntry {
  return entry.stoppedAt === null
}

export function durationMs(entry: CompletedEntry): number {
  return entry.stoppedAt - entry.startedAt
}

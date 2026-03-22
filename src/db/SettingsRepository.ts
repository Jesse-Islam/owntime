import { db } from './database'
import type { SettingsKey } from './schema'

export const SettingsRepository = {
  async get<T>(key: SettingsKey): Promise<T | undefined> {
    const row = await db.settings.get(key)
    return row?.value as T | undefined
  },

  async set<T>(key: SettingsKey, value: T): Promise<void> {
    await db.settings.put({ key, value })
  },

  async delete(key: SettingsKey): Promise<void> {
    await db.settings.delete(key)
  },

  async exportAll(): Promise<Record<string, unknown>> {
    const rows = await db.settings.toArray()
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },
}

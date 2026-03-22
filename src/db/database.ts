import Dexie, { type Table } from 'dexie'
import type { TimeEntry, Tag, Settings } from './schema'

export class OwnTimeDatabase extends Dexie {
  entries!: Table<TimeEntry, string>
  tags!: Table<Tag, string>
  settings!: Table<Settings, string>

  constructor() {
    super('OwnTimeDB')

    this.version(1).stores({
      // Only indexed fields listed here; all other fields stored but not indexed
      // stoppedAt is NOT indexed because IndexedDB cannot index null values
      entries:  'id, startedAt, *tagIds, createdAt',
      tags:     'id, name, createdAt',
      settings: 'key',
    })
  }
}

/** Singleton database instance */
export const db = new OwnTimeDatabase()

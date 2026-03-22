/**
 * Phase 2 — Repository integration tests
 * Uses fake-indexeddb so no real browser storage is touched.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../db/database'
import { EntriesRepository } from '../db/EntriesRepository'
import { TagsRepository } from '../db/TagsRepository'
import { SettingsRepository } from '../db/SettingsRepository'
import { isRunning } from '../db/schema'

// Re-create a fresh in-memory DB before every test
beforeEach(async () => {
  await db.entries.clear()
  await db.tags.clear()
  await db.settings.clear()
})

// ─── EntriesRepository ────────────────────────────────────────────────────────

describe('EntriesRepository', () => {
  it('creates a running entry with stoppedAt = null', async () => {
    const entry = await EntriesRepository.start(['tag-1'], 'hello')
    expect(entry.stoppedAt).toBeNull()
    expect(entry.tagIds).toEqual(['tag-1'])
    expect(entry.notes).toBe('hello')
  })

  it('getRunning returns the live entry', async () => {
    await EntriesRepository.start()
    const running = await EntriesRepository.getRunning()
    expect(running).not.toBeNull()
    expect(isRunning(running!)).toBe(true)
  })

  it('stop sets stoppedAt and persists', async () => {
    const entry = await EntriesRepository.start()
    const stopped = await EntriesRepository.stop(entry.id)
    expect(stopped).not.toBeNull()
    expect(stopped!.stoppedAt).toBeGreaterThan(0)
    const running = await EntriesRepository.getRunning()
    expect(running).toBeNull()
  })

  it('stop returns null for an already-stopped entry', async () => {
    const entry = await EntriesRepository.start()
    await EntriesRepository.stop(entry.id)
    const result = await EntriesRepository.stop(entry.id)
    expect(result).toBeNull()
  })

  it('getByDay returns entries that started today', async () => {
    const e = await EntriesRepository.start()
    await EntriesRepository.stop(e.id)
    const todayEntries = await EntriesRepository.getByDay(new Date())
    expect(todayEntries.some((x) => x.id === e.id)).toBe(true)
  })

  it('getByDay does not return entries from yesterday', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const entries = await EntriesRepository.getByDay(yesterday)
    // We only seeded today's data in the other tests; here the DB is clean
    expect(entries).toHaveLength(0)
  })

  it('update patches notes and refreshes updatedAt', async () => {
    const entry = await EntriesRepository.start()
    const before = entry.updatedAt
    await new Promise((r) => setTimeout(r, 5)) // ensure timestamp advances
    await EntriesRepository.update(entry.id, { notes: 'updated' })
    const fetched = await db.entries.get(entry.id)
    expect(fetched!.notes).toBe('updated')
    expect(fetched!.updatedAt).toBeGreaterThan(before)
  })

  it('delete removes the entry', async () => {
    const entry = await EntriesRepository.start()
    await EntriesRepository.delete(entry.id)
    const fetched = await db.entries.get(entry.id)
    expect(fetched).toBeUndefined()
  })

  it('totalMsInRange sums completed durations', async () => {
    const start = Date.now()
    const e = await EntriesRepository.start()
    await new Promise((r) => setTimeout(r, 20))
    await EntriesRepository.stop(e.id)
    const total = await EntriesRepository.totalMsInRange(start, Date.now())
    expect(total).toBeGreaterThan(0)
  })

  it('exportAll / importAll round-trips all entries', async () => {
    const e = await EntriesRepository.start()
    await EntriesRepository.stop(e.id)
    const exported = await EntriesRepository.exportAll()
    await EntriesRepository.importAll(exported)
    const afterImport = await EntriesRepository.exportAll()
    expect(afterImport).toHaveLength(exported.length)
    expect(afterImport[0].id).toBe(exported[0].id)
  })
})

// ─── TagsRepository ───────────────────────────────────────────────────────────

describe('TagsRepository', () => {
  it('upsert creates a new tag', async () => {
    const tag = await TagsRepository.upsert('work')
    expect(tag.name).toBe('work')
    expect(tag.color).toMatch(/^#/)
  })

  it('upsert returns existing tag on duplicate name (case-insensitive)', async () => {
    const a = await TagsRepository.upsert('Focus')
    const b = await TagsRepository.upsert('focus')
    expect(b.id).toBe(a.id)
    const all = await TagsRepository.getAll()
    expect(all).toHaveLength(1)
  })

  it('getAll returns tags sorted alphabetically', async () => {
    await TagsRepository.upsert('zzz')
    await TagsRepository.upsert('aaa')
    const tags = await TagsRepository.getAll()
    expect(tags[0].name).toBe('aaa')
    expect(tags[1].name).toBe('zzz')
  })

  it('delete removes tag and strips it from entries', async () => {
    const tag = await TagsRepository.upsert('removeme')
    const entry = await EntriesRepository.start([tag.id])
    await TagsRepository.delete(tag.id)
    const fetched = await db.entries.get(entry.id)
    expect(fetched!.tagIds).not.toContain(tag.id)
    const allTags = await TagsRepository.getAll()
    expect(allTags).toHaveLength(0)
  })
})

// ─── SettingsRepository ───────────────────────────────────────────────────────

describe('SettingsRepository', () => {
  it('set and get round-trips a value', async () => {
    await SettingsRepository.set('lastBackupAt', 12345)
    const val = await SettingsRepository.get<number>('lastBackupAt')
    expect(val).toBe(12345)
  })

  it('get returns undefined for missing key', async () => {
    const val = await SettingsRepository.get('lastBackupAt')
    expect(val).toBeUndefined()
  })

  it('delete removes the key', async () => {
    await SettingsRepository.set('lastBackupAt', 99)
    await SettingsRepository.delete('lastBackupAt')
    const val = await SettingsRepository.get('lastBackupAt')
    expect(val).toBeUndefined()
  })
})

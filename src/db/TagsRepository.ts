import { db } from './database'
import type { Tag } from './schema'

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
]

function nextColor(existingCount: number): string {
  return TAG_COLORS[existingCount % TAG_COLORS.length]
}

export const TagsRepository = {
  /** Return all tags sorted alphabetically. */
  async getAll(): Promise<Tag[]> {
    return db.tags.orderBy('name').toArray()
  },

  /** Find a tag by exact name (case-insensitive). */
  async findByName(name: string): Promise<Tag | undefined> {
    const lower = name.toLowerCase()
    const all = await db.tags.orderBy('name').toArray()
    return all.find((t) => t.name.toLowerCase() === lower)
  },

  /** Get or create a tag by name. Returns the tag either way. */
  async upsert(name: string): Promise<Tag> {
    const existing = await TagsRepository.findByName(name)
    if (existing) return existing
    const count = await db.tags.count()
    const tag: Tag = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: nextColor(count),
      createdAt: Date.now(),
    }
    await db.tags.add(tag)
    return tag
  },

  /** Update a tag's name or color. */
  async update(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<void> {
    await db.tags.update(id, patch)
  },

  /** Delete a tag and remove it from all entries that reference it. */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.tags, db.entries, async () => {
      await db.tags.delete(id)
      // Remove this tag from every entry that references it
      const affected = await db.entries.where('tagIds').equals(id).toArray()
      await Promise.all(
        affected.map((e) =>
          db.entries.update(e.id, {
            tagIds: e.tagIds.filter((t) => t !== id),
            updatedAt: Date.now(),
          })
        )
      )
    })
  },

  /** Export all tags (for backup). */
  async exportAll(): Promise<Tag[]> {
    return db.tags.toArray()
  },

  /** Replace all tags (used during restore). */
  async importAll(tags: Tag[]): Promise<void> {
    await db.transaction('rw', db.tags, async () => {
      await db.tags.clear()
      await db.tags.bulkAdd(tags)
    })
  },
}

import { BookSchema, CURRENT_SCHEMA_VERSION } from './schemas'
import type { Book } from './types'

export class BookMigrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookMigrationError'
  }
}

/**
 * Upgrade steps keyed by the version they upgrade FROM (v → v+1).
 * Empty while only v1 exists; add `1: (raw) => ({ ...raw, schemaVersion: 2, … })` when v2 arrives.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {}

function readVersion(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null) {
    throw new BookMigrationError('Book data is not an object')
  }
  const version = (raw as Record<string, unknown>).schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new BookMigrationError('Book data has no valid schemaVersion')
  }
  return version
}

/** Parse persisted book data (IndexedDB or Drive), upgrading older schema versions first. */
export function migrateBook(raw: unknown): Book {
  let version = readVersion(raw)
  if (version < 1 || version > CURRENT_SCHEMA_VERSION) {
    throw new BookMigrationError(`Unknown book schemaVersion ${version}`)
  }
  let data = raw as Record<string, unknown>
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) throw new BookMigrationError(`No migration from schemaVersion ${version}`)
    data = step(data)
    version += 1
  }
  const result = BookSchema.safeParse(data)
  if (!result.success) {
    throw new BookMigrationError(
      `Invalid book data: ${result.error.issues[0]?.message ?? 'unknown'}`,
    )
  }
  return result.data
}

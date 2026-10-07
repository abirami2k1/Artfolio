import { describe, expect, it } from 'vitest'
import { createBook, createPage } from './book'
import { BookMigrationError, migrateBook } from './migrate'

const book = { ...createBook({ title: 'Moths' }, { id: 'b1', now: 1 }), pages: [createPage('i1')] }

describe('migrateBook', () => {
  it('returns a v1 book unchanged (identity)', () => {
    expect(migrateBook(book)).toEqual(book)
  })

  it('parses book.json text round-trips', () => {
    expect(migrateBook(JSON.parse(JSON.stringify(book)))).toEqual(book)
  })

  it.each([0, 2, 99])('rejects unknown schemaVersion %i', (schemaVersion) => {
    expect(() => migrateBook({ ...book, schemaVersion })).toThrow(BookMigrationError)
    expect(() => migrateBook({ ...book, schemaVersion })).toThrow(/Unknown book schemaVersion/)
  })

  it.each([
    ['null', null],
    ['a string', 'book'],
    ['missing version', { ...book, schemaVersion: undefined }],
    ['fractional version', { ...book, schemaVersion: 1.5 }],
  ])('rejects %s', (_label, raw) => {
    expect(() => migrateBook(raw)).toThrow(BookMigrationError)
  })

  it('rejects v1 data that fails validation', () => {
    expect(() => migrateBook({ ...book, paperColor: 'beige' })).toThrow(/Invalid book data/)
  })
})

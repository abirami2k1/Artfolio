import { beforeEach, describe, expect, it } from 'vitest'
import { createBook, createPage } from '../../domain/book'
import type { Book } from '../../domain/types'
import { FolioDatabase } from './db'
import { LocalRepository } from './LocalRepository'

let db: FolioDatabase
let repo: LocalRepository

beforeEach(() => {
  db = new FolioDatabase(`test-${crypto.randomUUID()}`)
  repo = new LocalRepository(db)
})

function book(title: string, now: number, pages = 0): Book {
  const b = createBook({ title }, { id: `book-${title}`, now })
  return { ...b, pages: Array.from({ length: pages }, () => createPage()) }
}

function bytes(...values: number[]): Blob {
  return new Blob([new Uint8Array(values)], { type: 'image/webp' })
}

async function readBytes(blob: Blob | null): Promise<number[]> {
  return blob ? [...new Uint8Array(await blob.arrayBuffer())] : []
}

function imageInput(bookId: string, id: string) {
  return {
    id,
    bookId,
    sourceName: `${id}.png`,
    width: 1200,
    height: 800,
    display: bytes(1, 2, 3),
    thumb: bytes(9),
  }
}

describe('LocalRepository — books', () => {
  it('saves and reads a book back unchanged', async () => {
    const b = { ...book('Moths', 10), pages: [createPage('img-1'), createPage()] }
    await repo.saveBook(b)
    expect(await repo.getBook(b.id)).toEqual(b)
  })

  it('returns null for a missing book', async () => {
    expect(await repo.getBook('nope')).toBeNull()
  })

  it('overwrites on save', async () => {
    const b = book('Moths', 10)
    await repo.saveBook(b)
    await repo.saveBook({ ...b, title: 'Moths & Butterflies', updatedAt: 20 })
    expect(await repo.getBook(b.id)).toMatchObject({ title: 'Moths & Butterflies', updatedAt: 20 })
  })

  it('refuses to save an invalid book and writes nothing', async () => {
    const bad = { ...book('Moths', 10), paperColor: 'beige' }
    await expect(repo.saveBook(bad)).rejects.toThrow()
    expect(await db.books.count()).toBe(0)
  })

  it('parses every read through migrateBook', async () => {
    await db.books.put({ ...book('x', 1), title: '  Trimmed  ' })
    expect((await repo.getBook('book-x'))?.title).toBe('Trimmed')
    await db.books.put({ id: 'future', schemaVersion: 99 })
    await expect(repo.getBook('future')).rejects.toThrow(/schemaVersion/)
  })

  it('lists summaries oldest first with page counts, skipping unreadable books', async () => {
    await repo.saveBook(book('B', 200, 3))
    await repo.saveBook(book('A', 100, 0))
    await db.books.put({ id: 'corrupt', schemaVersion: 1, title: 42 })
    const list = await repo.listBooks()
    expect(list.map((s) => [s.title, s.pageCount])).toEqual([
      ['A', 0],
      ['B', 3],
    ])
    expect(list[0]).not.toHaveProperty('pages')
    expect(list[0]).toMatchObject({ shape: expect.any(Object), cover: expect.any(Object) })
  })
})

describe('LocalRepository — images', () => {
  it('stores metadata and both blobs', async () => {
    const asset = await repo.putImage(imageInput('book-A', 'img-1'))
    expect(asset).toMatchObject({
      id: 'img-1',
      bookId: 'book-A',
      width: 1200,
      height: 800,
      mime: 'image/webp',
      bytes: 3,
      sourceName: 'img-1.png',
    })
    expect(await repo.getImage('img-1')).toEqual(asset)
    const display = await repo.getImageBlob('img-1', 'display')
    expect(display?.type).toBe('image/webp')
    expect(await readBytes(display)).toEqual([1, 2, 3])
    expect(await readBytes(await repo.getImageBlob('img-1', 'thumb'))).toEqual([9])
  })

  it('generates an id when none is given', async () => {
    const asset = await repo.putImage({ ...imageInput('book-A', 'unused'), id: undefined })
    expect(asset.id).toMatch(/[0-9a-f-]{36}/)
  })

  it('returns null for missing images and blobs', async () => {
    expect(await repo.getImage('nope')).toBeNull()
    expect(await repo.getImageBlob('nope', 'display')).toBeNull()
  })

  it('deleteImage removes metadata and blobs', async () => {
    await repo.putImage(imageInput('book-A', 'img-1'))
    await repo.putImage(imageInput('book-A', 'img-2'))
    await repo.deleteImage('img-1')
    expect(await repo.getImage('img-1')).toBeNull()
    expect(await repo.getImageBlob('img-1', 'display')).toBeNull()
    expect(await repo.getImageBlob('img-1', 'thumb')).toBeNull()
    expect(await repo.getImage('img-2')).not.toBeNull()
  })
})

describe('LocalRepository — deleteBook', () => {
  it('removes the book, its images and their blobs, leaving no orphans', async () => {
    const a = book('A', 1)
    const b = book('B', 2)
    await repo.saveBook(a)
    await repo.saveBook(b)
    await repo.putImage(imageInput(a.id, 'a1'))
    await repo.putImage(imageInput(a.id, 'a2'))
    await repo.putImage(imageInput(b.id, 'b1'))

    await repo.deleteBook(a.id)

    expect(await repo.getBook(a.id)).toBeNull()
    expect(await db.images.toCollection().primaryKeys()).toEqual(['b1'])
    expect((await db.blobs.toArray()).map((r) => r.imageId).sort()).toEqual(['b1', 'b1'])
    expect(await repo.getBook(b.id)).not.toBeNull()
  })

  it('works for a book without images and for unknown ids', async () => {
    await repo.saveBook(book('A', 1))
    await repo.deleteBook('book-A')
    await repo.deleteBook('never-existed')
    expect(await db.books.count()).toBe(0)
  })
})

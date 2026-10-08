import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPage } from '../domain/book'
import { CUSTOM_PRESET_ID } from '../domain/config'
import { MemoryRepository } from '../storage/memory/MemoryRepository'
import { createLibraryStore } from './libraryStore'
import { useToastStore } from './toastStore'

let repo: MemoryRepository
let clock: number
let store: ReturnType<typeof createLibraryStore>

beforeEach(() => {
  repo = new MemoryRepository()
  clock = 1000
  store = createLibraryStore(repo, () => clock++)
  useToastStore.setState({ toasts: [] })
})

const errorToasts = () => useToastStore.getState().toasts.filter((t) => t.tone === 'error')

describe('libraryStore', () => {
  it('loads summaries from the repository', async () => {
    await store.getState().createBook({ title: 'A' })
    const fresh = createLibraryStore(repo)
    await fresh.getState().load()
    expect(fresh.getState()).toMatchObject({
      status: 'ready',
      books: [{ title: 'A', pageCount: 0 }],
    })
  })

  it('creates a book, persists it and adds it to the list', async () => {
    const book = await store.getState().createBook({ title: 'Moths', presetId: 'square' })
    expect(book).not.toBeNull()
    expect(await repo.getBook(book!.id)).toEqual(book)
    expect(store.getState().books).toEqual([
      expect.objectContaining({ id: book!.id, title: 'Moths' }),
    ])
  })

  it('updates settings, stamps updatedAt and refreshes the summary', async () => {
    const book = (await store.getState().createBook({ title: 'Moths' }))!
    const ok = await store.getState().updateBook(book.id, {
      title: 'Night Moths',
      orientation: 'landscape',
      cover: { color: '#223344', showTitle: false },
    })
    expect(ok).toBe(true)
    const saved = await repo.getBook(book.id)
    expect(saved).toMatchObject({ title: 'Night Moths', orientation: 'landscape' })
    expect(saved!.updatedAt).toBeGreaterThan(book.updatedAt)
    expect(store.getState().books[0]).toMatchObject({
      title: 'Night Moths',
      cover: { color: '#223344' },
    })
  })

  it('deletes a book', async () => {
    const a = (await store.getState().createBook({ title: 'A' }))!
    await store.getState().createBook({ title: 'B' })
    expect(await store.getState().deleteBook(a.id)).toBe(true)
    expect(store.getState().books.map((b) => b.title)).toEqual(['B'])
    expect(await repo.getBook(a.id)).toBeNull()
  })

  it('shows friendly errors instead of throwing', async () => {
    expect(await store.getState().createBook({ presetId: CUSTOM_PRESET_ID })).toBeNull()
    expect(await store.getState().updateBook('missing', { title: 'x' })).toBe(false)
    expect(await store.getState().updateBook('missing', { title: 'x' })).toBe(false)

    vi.spyOn(repo, 'listBooks').mockRejectedValueOnce(new Error('boom'))
    await store.getState().load()
    expect(store.getState().status).toBe('error')

    vi.spyOn(repo, 'deleteBook').mockRejectedValueOnce(new Error('boom'))
    expect(await store.getState().deleteBook('x')).toBe(false)

    expect(errorToasts()).toHaveLength(5)
    expect(errorToasts().every((t) => !t.message.includes('boom'))).toBe(true)
  })

  it('rejects invalid settings without changing the stored book', async () => {
    const book = (await store.getState().createBook({ title: 'Moths' }))!
    expect(await store.getState().updateBook(book.id, { paperColor: 'beige' })).toBe(false)
    expect((await repo.getBook(book.id))?.paperColor).toBe(book.paperColor)
  })

  it('appends pages to a stored book and refreshes its page count', async () => {
    const book = (await store.getState().createBook({ title: 'A' }))!
    await store.getState().appendPages(book.id, [createPage('i1', { id: 'p1' })])
    await store.getState().appendPages(book.id, [createPage('i2', { id: 'p2' })])
    expect((await repo.getBook(book.id))?.pages.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(store.getState().books[0].pageCount).toBe(2)
    await expect(store.getState().appendPages('missing', [])).rejects.toThrow()
  })
})

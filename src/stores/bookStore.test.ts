import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBook, createPage } from '../domain/book'
import { AUTOSAVE_DEBOUNCE_MS } from '../domain/config'
import type { Book } from '../domain/types'
import { MemoryRepository } from '../storage/memory/MemoryRepository'
import { createBookStore } from './bookStore'
import { useToastStore } from './toastStore'

let repo: MemoryRepository
let clock: number
let store: ReturnType<typeof createBookStore>

const seed: Book = {
  ...createBook({ title: 'Moths' }, { id: 'b1', now: 1 }),
  pages: [createPage('i1', { id: 'p1' }), createPage('i2', { id: 'p2' })],
}

const rename = (title: string) => (book: Book) => ({ ...book, title })

beforeEach(async () => {
  vi.useFakeTimers()
  repo = new MemoryRepository()
  await repo.saveBook(seed)
  clock = 100
  store = createBookStore(repo, () => clock++)
  useToastStore.setState({ toasts: [] })
})

afterEach(() => vi.useRealTimers())

describe('bookStore', () => {
  it('opens a book and selects its first page', async () => {
    await store.getState().open('b1')
    expect(store.getState()).toMatchObject({
      status: 'ready',
      selectedPageId: 'p1',
      saveStatus: 'saved',
    })
    expect(store.getState().book?.title).toBe('Moths')
  })

  it('reports a missing book', async () => {
    await store.getState().open('nope')
    expect(store.getState()).toMatchObject({ status: 'missing', book: null })
  })

  it('selects pages', async () => {
    await store.getState().open('b1')
    store.getState().selectPage('p2')
    expect(store.getState().selectedPageId).toBe('p2')
  })

  it('rapid edits produce one write after the debounce', async () => {
    await store.getState().open('b1')
    const save = vi.spyOn(repo, 'saveBook')
    for (const title of ['M', 'Mo', 'Mot', 'Moth', 'Moths!']) {
      store.getState().update(rename(title))
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS / 4)
    }
    expect(save).not.toHaveBeenCalled()
    expect(store.getState().saveStatus).toBe('pending')

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)
    expect(save).toHaveBeenCalledOnce()
    expect(save.mock.calls[0][0].title).toBe('Moths!')
    expect(store.getState().saveStatus).toBe('saved')
    expect((await repo.getBook('b1'))?.title).toBe('Moths!')
  })

  it('stamps updatedAt on every edit', async () => {
    await store.getState().open('b1')
    store.getState().update(rename('A'))
    const first = store.getState().book!.updatedAt
    store.getState().update(rename('B'))
    expect(store.getState().book!.updatedAt).toBeGreaterThan(first)
  })

  it('saves again when edits arrive while a save is in flight', async () => {
    await store.getState().open('b1')
    let release!: () => void
    const realSave = repo.saveBook.bind(repo)
    const save = vi.spyOn(repo, 'saveBook').mockImplementationOnce(async (b) => {
      await new Promise<void>((r) => (release = r))
      return realSave(b)
    })
    store.getState().update(rename('first'))
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)
    expect(store.getState().saveStatus).toBe('saving')

    store.getState().update(rename('second'))
    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(store.getState().saveStatus).toBe('pending')

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)
    expect(save).toHaveBeenCalledTimes(2)
    expect((await repo.getBook('b1'))?.title).toBe('second')
    expect(store.getState().saveStatus).toBe('saved')
  })

  it('flush saves immediately; close flushes then clears', async () => {
    await store.getState().open('b1')
    store.getState().update(rename('Now'))
    await store.getState().close()
    expect((await repo.getBook('b1'))?.title).toBe('Now')
    expect(store.getState()).toMatchObject({ book: null, status: 'idle' })
  })

  it('does not write when nothing changed', async () => {
    await store.getState().open('b1')
    const save = vi.spyOn(repo, 'saveBook')
    await store.getState().flush()
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS * 2)
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps edits in memory and shows an error when saving fails', async () => {
    await store.getState().open('b1')
    vi.spyOn(repo, 'saveBook').mockRejectedValueOnce(new Error('disk full'))
    store.getState().update(rename('Unsaved'))
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)
    expect(store.getState().saveStatus).toBe('error')
    expect(store.getState().book?.title).toBe('Unsaved')
    expect(useToastStore.getState().toasts.map((t) => t.tone)).toEqual(['error'])
    expect((await repo.getBook('b1'))?.title).toBe('Moths')
  })

  it('saves pending edits to the previous book before opening another', async () => {
    await repo.saveBook({ ...seed, id: 'b2', title: 'Other' })
    await store.getState().open('b1')
    store.getState().update(rename('Edited'))
    await store.getState().open('b2')
    expect((await repo.getBook('b1'))?.title).toBe('Edited')
    expect(store.getState().book?.title).toBe('Other')
  })
})

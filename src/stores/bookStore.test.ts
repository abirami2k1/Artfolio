import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBook, createPage } from '../domain/book'
import { AUTOSAVE_DEBOUNCE_MS, EDITOR_SETTINGS } from '../domain/config'
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

  it('undo restores the book before the last edit and saves it', async () => {
    await store.getState().open('b1')
    store.getState().update(rename('One'))
    clock += EDITOR_SETTINGS.undoMergeMs
    store.getState().update(rename('Two'))
    expect(store.getState().undoCount).toBe(2)
    store.getState().undo()
    expect(store.getState().book?.title).toBe('One')
    store.getState().undo()
    expect(store.getState().book?.title).toBe('Moths')
    expect(store.getState().undoCount).toBe(0)
    store.getState().undo() // nothing left: no-op
    await store.getState().flush()
    expect((await repo.getBook('b1'))?.title).toBe('Moths')
  })

  it('quick edits with the same merge key undo as one step', async () => {
    await store.getState().open('b1')
    for (const title of ['a', 'ab', 'abc'])
      store.getState().update(rename(title), { mergeKey: 'title' })
    expect(store.getState().undoCount).toBe(1)
    clock += EDITOR_SETTINGS.undoMergeMs
    store.getState().update(rename('later'), { mergeKey: 'title' })
    expect(store.getState().undoCount).toBe(2)
    store.getState().undo()
    store.getState().undo()
    expect(store.getState().book?.title).toBe('Moths')
  })

  it('keeps at most historyLimit undo steps', async () => {
    await store.getState().open('b1')
    for (let i = 0; i < EDITOR_SETTINGS.historyLimit + 5; i++)
      store.getState().update(rename(`t${i}`))
    expect(store.getState().undoCount).toBe(EDITOR_SETTINGS.historyLimit)
  })

  it('deletes a removed page’s image only on close, and only if still unused', async () => {
    const blob = new Blob(['x'])
    for (const id of ['i1', 'i2']) {
      await repo.putImage({
        id,
        bookId: 'b1',
        sourceName: id,
        width: 1,
        height: 1,
        display: blob,
        thumb: blob,
      })
    }
    await store.getState().open('b1')
    store.getState().update((b) => ({ ...b, pages: b.pages.filter((p) => p.id !== 'p1') }))
    expect(await repo.getImage('i1')).not.toBeNull() // still there, so undo works
    store.getState().update((b) => ({ ...b, pages: b.pages.filter((p) => p.id !== 'p2') }))
    store.getState().undo() // brings p2 (and i2) back
    await store.getState().close()
    expect(await repo.getImage('i1')).toBeNull()
    expect(await repo.getImage('i2')).not.toBeNull()
  })

  it('keeps dropped images when the final save failed', async () => {
    const blob = new Blob(['x'])
    await repo.putImage({
      id: 'i1',
      bookId: 'b1',
      sourceName: 'i1',
      width: 1,
      height: 1,
      display: blob,
      thumb: blob,
    })
    await store.getState().open('b1')
    vi.spyOn(repo, 'saveBook').mockRejectedValue(new Error('disk full'))
    store.getState().update((b) => ({ ...b, pages: b.pages.filter((p) => p.id !== 'p1') }))
    await store.getState().close()
    expect(await repo.getImage('i1')).not.toBeNull()
  })

  it('a close still running when the next page opens the book does not clear it', async () => {
    await store.getState().open('b1')
    store.getState().update(rename('Edited'))
    const closing = store.getState().close() // e.g. the editor unmounting
    const opening = store.getState().open('b1') // the reader mounting
    await Promise.all([closing, opening])
    expect(store.getState()).toMatchObject({ status: 'ready' })
    expect(store.getState().book?.title).toBe('Edited')
  })
})

import { create } from 'zustand'
import { AUTOSAVE_DEBOUNCE_MS, EDITOR_SETTINGS } from '../domain/config'
import { imageIdsInUse } from '../domain/editor'
import type { Book } from '../domain/types'
import { repository, type BookRepository } from '../storage'
import { toast } from './toastStore'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

export interface BookState {
  book: Book | null
  status: 'idle' | 'loading' | 'ready' | 'missing' | 'error'
  selectedPageId: string | null
  saveStatus: SaveStatus
  /** Number of edits that can be undone. */
  undoCount: number
  /** Load a book (saving any pending edits to the previous one first). */
  open(id: string): Promise<void>
  /**
   * Save pending edits, delete images the edits stopped using (kept until now so undo works),
   * and clear the store.
   */
  close(): Promise<void>
  selectPage(pageId: string | null): void
  /**
   * Apply an edit to the open book and schedule a debounced save. Edits with the same
   * `mergeKey` in quick succession (a drag, a slider) undo as one step.
   */
  update(recipe: (book: Book) => Book, options?: { mergeKey?: string }): void
  /** Restore the book as it was before the last edit. */
  undo(): void
  /** Schedule a save after AUTOSAVE_DEBOUNCE_MS without further edits. */
  save(): void
  /** Save now if there are unsaved edits. */
  flush(): Promise<void>
}

export function createBookStore(repo: BookRepository, now: () => number = Date.now) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let version = 0 // bumps on every edit
  let savedVersion = 0
  let inFlight: Promise<void> = Promise.resolve()
  let history: Book[] = [] // snapshots before each undoable edit, newest last
  let lastEdit = { key: '', at: -Infinity }
  const releasedImages = new Set<string>() // dropped by an edit; deleted on close if still unused

  function noteDroppedImages(before: Book, after: Book) {
    const kept = imageIdsInUse(after)
    for (const id of imageIdsInUse(before)) if (!kept.has(id)) releasedImages.add(id)
  }

  async function deleteReleasedImages(book: Book | null) {
    const inUse = book ? imageIdsInUse(book) : new Set<string>()
    const unused = [...releasedImages].filter((id) => !inUse.has(id))
    releasedImages.clear()
    await Promise.all(unused.map((id) => repo.deleteImage(id).catch(() => {})))
  }

  // open/close run one at a time, in call order: a page leaving (close) and the next page
  // arriving (open) must not interleave, or the late close would clear the new book.
  let lifecycle: Promise<void> = Promise.resolve()
  const enqueue = (task: () => Promise<void>) => (lifecycle = lifecycle.then(task, task))

  function resetHistory() {
    history = []
    lastEdit = { key: '', at: -Infinity }
  }

  return create<BookState>()((set, get) => {
    async function writeLatest() {
      const { book } = get()
      if (!book || version === savedVersion) return
      const snapshot = version
      set({ saveStatus: 'saving' })
      try {
        await repo.saveBook(book)
        savedVersion = snapshot
        set({ saveStatus: version === snapshot ? 'saved' : 'pending' })
      } catch {
        set({ saveStatus: 'error' })
        toast('Couldn’t save your changes', 'error')
      }
    }

    async function closeNow() {
      await get().flush()
      if (get().saveStatus !== 'error') await deleteReleasedImages(get().book)
      resetHistory()
      set({ book: null, status: 'idle', selectedPageId: null, saveStatus: 'saved', undoCount: 0 })
    }

    return {
      book: null,
      status: 'idle',
      selectedPageId: null,
      saveStatus: 'saved',
      undoCount: 0,

      open(id) {
        return enqueue(async () => {
          await closeNow()
          set({ status: 'loading' })
          try {
            const book = await repo.getBook(id)
            version = savedVersion = 0
            set({
              book,
              status: book ? 'ready' : 'missing',
              selectedPageId: book?.pages[0]?.id ?? null,
            })
          } catch {
            set({ status: 'error' })
            toast('Couldn’t open the book', 'error')
          }
        })
      },

      close() {
        return enqueue(closeNow)
      },

      selectPage(pageId) {
        set({ selectedPageId: pageId })
      },

      update(recipe, options = {}) {
        const { book } = get()
        if (!book) return
        const at = now()
        const key = options.mergeKey ?? ''
        const merges =
          key !== '' && key === lastEdit.key && at - lastEdit.at < EDITOR_SETTINGS.undoMergeMs
        if (!merges) history = [...history, book].slice(-EDITOR_SETTINGS.historyLimit)
        lastEdit = { key, at }
        const next = { ...recipe(book), updatedAt: at }
        noteDroppedImages(book, next)
        version += 1
        set({ book: next, saveStatus: 'pending', undoCount: history.length })
        get().save()
      },

      undo() {
        const { book, selectedPageId } = get()
        const previous = history.at(-1)
        if (!book || !previous) return
        history = history.slice(0, -1)
        lastEdit = { key: '', at: -Infinity }
        const restored = { ...previous, updatedAt: now() }
        noteDroppedImages(book, restored)
        const stillThere = restored.pages.some((page) => page.id === selectedPageId)
        version += 1
        set({
          book: restored,
          saveStatus: 'pending',
          undoCount: history.length,
          selectedPageId: stillThere ? selectedPageId : (restored.pages[0]?.id ?? null),
        })
        get().save()
      },

      save() {
        clearTimeout(timer)
        timer = setTimeout(() => void get().flush(), AUTOSAVE_DEBOUNCE_MS)
      },

      flush() {
        clearTimeout(timer)
        inFlight = inFlight.then(writeLatest)
        return inFlight
      },
    }
  })
}

export const useBookStore = createBookStore(repository)

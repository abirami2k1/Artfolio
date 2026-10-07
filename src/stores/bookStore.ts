import { create } from 'zustand'
import { AUTOSAVE_DEBOUNCE_MS } from '../domain/config'
import type { Book } from '../domain/types'
import { repository, type BookRepository } from '../storage'
import { toast } from './toastStore'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

export interface BookState {
  book: Book | null
  status: 'idle' | 'loading' | 'ready' | 'missing' | 'error'
  selectedPageId: string | null
  saveStatus: SaveStatus
  /** Load a book (saving any pending edits to the previous one first). */
  open(id: string): Promise<void>
  /** Save pending edits and clear the store. */
  close(): Promise<void>
  selectPage(pageId: string | null): void
  /** Apply an edit to the open book and schedule a debounced save. */
  update(recipe: (book: Book) => Book): void
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

    return {
      book: null,
      status: 'idle',
      selectedPageId: null,
      saveStatus: 'saved',

      async open(id) {
        await get().flush()
        set({ book: null, status: 'loading', selectedPageId: null, saveStatus: 'saved' })
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
      },

      async close() {
        await get().flush()
        set({ book: null, status: 'idle', selectedPageId: null, saveStatus: 'saved' })
      },

      selectPage(pageId) {
        set({ selectedPageId: pageId })
      },

      update(recipe) {
        const { book } = get()
        if (!book) return
        version += 1
        set({ book: { ...recipe(book), updatedAt: now() }, saveStatus: 'pending' })
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

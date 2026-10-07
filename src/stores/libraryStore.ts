import { create } from 'zustand'
import { createBook, type CreateBookInput } from '../domain/book'
import type { Book } from '../domain/types'
import { repository, type BookRepository, type BookSummary } from '../storage'
import { toBookSummary } from '../storage/repository'
import { requestPersistentStorage } from '../storage/persistence'
import { toast } from './toastStore'

/** Book-level settings editable from the shelf. */
export type BookSettings = Partial<
  Pick<Book, 'title' | 'shape' | 'orientation' | 'displaySize' | 'cover' | 'paperColor'>
>

export interface LibraryState {
  books: BookSummary[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  load(): Promise<void>
  /** Returns the new book, or null (with a toast) on failure. */
  createBook(input: CreateBookInput): Promise<Book | null>
  updateBook(id: string, settings: BookSettings): Promise<boolean>
  deleteBook(id: string): Promise<boolean>
}

export function createLibraryStore(repo: BookRepository, now: () => number = Date.now) {
  return create<LibraryState>()((set, get) => ({
    books: [],
    status: 'idle',

    async load() {
      set({ status: 'loading' })
      try {
        set({ books: await repo.listBooks(), status: 'ready' })
      } catch {
        set({ status: 'error' })
        toast('Couldn’t load your books', 'error')
      }
    },

    async createBook(input) {
      try {
        const book = createBook(input, { now: now() })
        await repo.saveBook(book)
        set({ books: [...get().books, toBookSummary(book)] })
        void requestPersistentStorage()
        return book
      } catch {
        toast('Couldn’t create the book', 'error')
        return null
      }
    },

    async updateBook(id, settings) {
      try {
        const book = await repo.getBook(id)
        if (!book) throw new Error('Book not found')
        const updated: Book = { ...book, ...settings, updatedAt: now() }
        await repo.saveBook(updated)
        set({ books: get().books.map((b) => (b.id === id ? toBookSummary(updated) : b)) })
        return true
      } catch {
        toast('Couldn’t save the book settings', 'error')
        return false
      }
    },

    async deleteBook(id) {
      try {
        await repo.deleteBook(id)
        set({ books: get().books.filter((b) => b.id !== id) })
        return true
      } catch {
        toast('Couldn’t delete the book', 'error')
        return false
      }
    },
  }))
}

export const useLibraryStore = createLibraryStore(repository)

import { create } from 'zustand'
import { createPage } from '../domain/book'
import { classifyImportFile, planImport } from '../domain/import'
import type { ImageAsset, Page } from '../domain/types'
import {
  failureReason,
  rejectedMessage,
  summaryMessage,
  type ImportFailure,
  type ImportResult,
} from '../features/import/importMessages'
import { repository, type BookRepository } from '../storage'
import { processImage, type ProcessedImage } from '../workers/processImage'
import { useBookStore } from './bookStore'
import { useLibraryStore } from './libraryStore'
import { toast } from './toastStore'

export interface ImportProgress {
  bookId: string
  total: number
  done: number
  current: string
}

export interface ImportState {
  progress: ImportProgress | null
  /**
   * Import files into a book as new pages, in natural filename order, one at a time. A file
   * that fails is skipped and reported; the rest still import. Returns null if nothing ran.
   */
  importFiles(bookId: string, files: readonly File[]): Promise<ImportResult | null>
  /** Process and store one image (e.g. to replace a page's image). Null, with a toast, on failure. */
  importImage(bookId: string, file: File): Promise<ImageAsset | null>
}

export interface ImportDeps {
  repo: BookRepository
  process(file: Blob): Promise<ProcessedImage>
  appendPages(bookId: string, pages: Page[]): Promise<void>
}

/** Pages go through the open book's store when it's open (so its autosave owns the write). */
async function appendToBook(bookId: string, pages: Page[]) {
  const open = useBookStore.getState()
  if (open.book?.id === bookId) {
    open.update((book) => ({ ...book, pages: [...book.pages, ...pages] }))
    return
  }
  await useLibraryStore.getState().appendPages(bookId, pages)
}

/** A failure whose message is fit to show the user. */
class ImportFileError extends Error {}

export function createImportStore({ repo, process, appendPages }: ImportDeps) {
  /** Process and store one file. */
  async function storeImage(bookId: string, file: File): Promise<ImageAsset> {
    let processed: ProcessedImage
    try {
      processed = await process(file)
    } catch {
      throw new ImportFileError(failureReason(classifyImportFile(file) === 'heic'))
    }
    return repo.putImage({ bookId, sourceName: file.name, ...processed })
  }

  /** Process, store and append one file. */
  async function importOne(bookId: string, file: File) {
    const asset = await storeImage(bookId, file)
    try {
      await appendPages(bookId, [createPage(asset.id)])
    } catch (error) {
      await repo.deleteImage(asset.id).catch(() => {}) // don't leave an orphaned image behind
      throw error
    }
  }

  return create<ImportState>()((set, get) => ({
    progress: null,

    async importFiles(bookId, files) {
      if (get().progress) {
        toast('Still importing — wait for it to finish', 'error')
        return null
      }
      const { accepted, rejected } = planImport(files)
      if (rejected.length > 0) toast(rejectedMessage(rejected.map((f) => f.name)), 'error')
      if (accepted.length === 0) return null

      const failures: ImportFailure[] = []
      let added = 0
      try {
        for (const [index, file] of accepted.entries()) {
          set({ progress: { bookId, total: accepted.length, done: index, current: file.name } })
          try {
            await importOne(bookId, file)
            added += 1
          } catch (error) {
            const reason = error instanceof ImportFileError ? error.message : 'couldn’t save it'
            failures.push({ name: file.name, reason })
          }
        }
      } finally {
        set({ progress: null })
      }
      const result = { added, failures }
      toast(summaryMessage(result), added === 0 ? 'error' : 'success')
      return result
    },

    async importImage(bookId, file) {
      if (classifyImportFile(file) === 'unsupported') {
        toast(rejectedMessage([file.name]), 'error')
        return null
      }
      try {
        return await storeImage(bookId, file)
      } catch (error) {
        const reason = error instanceof ImportFileError ? error.message : 'couldn’t save it'
        toast(`Couldn’t use ${file.name}: ${reason}`, 'error')
        return null
      }
    },
  }))
}

export const useImportStore = createImportStore({
  repo: repository,
  process: processImage,
  appendPages: appendToBook,
})

import { createPage, DEFAULT_TRANSFORM } from '../../domain/book'
import { toggleSpread } from '../../domain/editor'
import {
  expandToRenderPages,
  insertPage,
  movePage,
  removePage,
  updatePage,
} from '../../domain/pages'
import type { Page } from '../../domain/types'
import { useBookStore } from '../../stores/bookStore'
import { confirm } from '../../stores/confirmStore'
import { useImportStore } from '../../stores/importStore'
import { toast } from '../../stores/toastStore'
import { pickImageFiles } from '../import/useImportPicker'

const store = () => useBookStore.getState()

/** Change one page. Same-kind edits in quick succession (`mergeKey`) undo together. */
export function editPage(pageId: string, recipe: (page: Page) => Page, mergeKey?: string) {
  store().update((book) => ({ ...book, pages: updatePage(book.pages, pageId, recipe) }), {
    mergeKey: mergeKey && `${mergeKey}:${pageId}`,
  })
}

/** Insert a blank page after `afterPageId` (or at the end) and select it. */
export function insertBlankPage(afterPageId: string | null) {
  const page = createPage()
  store().update((book) => {
    const index = book.pages.findIndex((p) => p.id === afterPageId)
    return { ...book, pages: insertPage(book.pages, page, index < 0 ? undefined : index + 1) }
  })
  store().selectPage(page.id)
}

/** Ask, then remove the page and select its neighbor. Its image is deleted on close if unused. */
export async function removePageConfirmed(pageId: string, pageNumber: number) {
  const confirmed = await confirm({
    title: `Remove page ${pageNumber}?`,
    message: 'You can undo this until you leave the editor.',
    confirmLabel: 'Remove page',
    destructive: true,
  })
  if (!confirmed) return
  const { book } = store()
  if (!book) return
  const index = book.pages.findIndex((p) => p.id === pageId)
  const remaining = removePage(book.pages, pageId)
  store().update((b) => ({ ...b, pages: removePage(b.pages, pageId) }))
  store().selectPage(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
}

/** Pick a new image for a page; its layout starts fresh, other settings stay. */
export function replaceImage(bookId: string, pageId: string) {
  pickImageFiles(async ([file]) => {
    const asset = await useImportStore.getState().importImage(bookId, file)
    if (!asset) return
    editPage(pageId, (page) => ({
      ...page,
      kind: page.kind === 'blank' ? 'image' : page.kind,
      imageId: asset.id,
      transform: { ...DEFAULT_TRANSFORM },
    }))
  }, false)
}

/** Image ↔ spread. Tells the user when a blank page had to be added to keep spreads paired. */
export function toggleSpreadPage(pageId: string) {
  const { book } = store()
  if (!book) return
  const fillers = (pages: Page[]) => expandToRenderPages({ pages }, 'spread').fillersInserted
  const pages = updatePage(book.pages, pageId, toggleSpread)
  store().update((b) => ({ ...b, pages: updatePage(b.pages, pageId, toggleSpread) }))
  if (fillers(pages) > fillers(book.pages)) {
    toast('Added a blank page before this spread so it starts on a left page')
  }
}

/** Move a page from one position to another. */
export function reorderPages(from: number, to: number) {
  store().update((book) => ({ ...book, pages: movePage(book.pages, from, to) }))
}

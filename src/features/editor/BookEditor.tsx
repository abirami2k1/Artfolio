import { useEffect } from 'react'
import { Link } from 'react-router'
import { AddImageIcon, PlusIcon } from '../../components/icons'
import type { Book } from '../../domain/types'
import { isTypingOrModal } from '../../hooks/keyboard'
import { useBookStore, type SaveStatus } from '../../stores/bookStore'
import { useImportPicker } from '../import/useImportPicker'
import EditorCanvas from './EditorCanvas'
import { insertBlankPage, reorderPages } from './editorActions'
import PageList from './PageList'
import PagePanel from './PagePanel'

const SAVE_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  pending: 'Saving…',
  saving: 'Saving…',
  error: 'Couldn’t save',
}

const PILL =
  'inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-sm shadow-sm ring-1 ring-ink/10 transition hover:shadow-md disabled:opacity-40 disabled:hover:shadow-sm'

/** Edit mode: page list, the selected page on a canvas at true ratio, and its controls. */
function BookEditor({ book }: { book: Book }) {
  const selectedPageId = useBookStore((s) => s.selectedPageId)
  const saveStatus = useBookStore((s) => s.saveStatus)
  const undoCount = useBookStore((s) => s.undoCount)
  const selectPage = useBookStore((s) => s.selectPage)
  const pickImages = useImportPicker()
  const index = book.pages.findIndex((p) => p.id === selectedPageId)
  const page = index >= 0 ? book.pages[index] : null

  // Keep a page selected (e.g. after images are added to an empty book).
  useEffect(() => {
    if (!page && book.pages.length > 0) selectPage(book.pages[0].id)
  }, [page, book.pages, selectPage])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingOrModal(event)) return
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        useBookStore.getState().undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-4 py-3">
        <Link
          to={`/book/${book.id}`}
          className="rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-sm hover:brightness-110"
        >
          Done
        </Link>
        <div className="min-w-0 flex-1 basis-40 px-2">
          <h1 className="truncate font-display text-xl">{book.title}</h1>
          <p
            className={`text-xs ${saveStatus === 'error' ? 'text-accent' : 'text-muted'}`}
            role="status"
          >
            {SAVE_LABELS[saveStatus]}
          </p>
        </div>
        <button
          type="button"
          className={PILL}
          onClick={() => useBookStore.getState().undo()}
          disabled={undoCount === 0}
          title="Undo (Ctrl/⌘ Z)"
        >
          ↶ Undo
        </button>
        <button type="button" className={PILL} onClick={() => insertBlankPage(selectedPageId)}>
          <PlusIcon width={16} height={16} />
          Blank page
        </button>
        <button type="button" className={PILL} onClick={() => pickImages(book.id)}>
          <AddImageIcon width={16} height={16} />
          Add images
        </button>
      </header>

      {book.pages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="font-display text-2xl">No pages yet</p>
          <p className="text-muted">Drop images here, or use “Add images”.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="order-2 shrink-0 border-t border-ink/10 md:order-1 md:w-48 md:overflow-y-auto md:border-r md:border-t-0">
            <PageList
              book={book}
              selectedPageId={selectedPageId}
              onSelect={selectPage}
              onReorder={reorderPages}
            />
          </aside>
          <main className="order-1 min-h-[45vh] flex-1 md:order-2 md:min-h-0">
            {page && <EditorCanvas book={book} page={page} />}
          </main>
          <aside className="order-3 max-h-[40vh] shrink-0 overflow-y-auto border-t border-ink/10 md:max-h-none md:w-72 md:border-l md:border-t-0">
            {page && <PagePanel key={page.id} book={book} page={page} pageNumber={index + 1} />}
          </aside>
        </div>
      )}
    </div>
  )
}

export default BookEditor

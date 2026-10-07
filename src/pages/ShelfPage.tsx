import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { PlusIcon } from '../components/icons'
import BookFormDialog from '../features/shelf/BookFormDialog'
import {
  defaultFormValues,
  formValuesFromBook,
  toCreateInput,
  toSettings,
} from '../features/shelf/bookForm'
import EmptyShelf from '../features/shelf/EmptyShelf'
import SelectedBookChrome from '../features/shelf/SelectedBookChrome'
import ShelfCarousel from '../features/shelf/ShelfCarousel'
import type { BookSummary } from '../storage'
import { confirm } from '../stores/confirmStore'
import { useLibraryStore } from '../stores/libraryStore'
import { useShelfStore } from '../stores/shelfStore'
import { toast } from '../stores/toastStore'

type DialogState = { kind: 'create' } | { kind: 'settings'; book: BookSummary } | null

function ShelfPage() {
  const books = useLibraryStore((s) => s.books)
  const status = useLibraryStore((s) => s.status)
  const selectedBookId = useShelfStore((s) => s.selectedBookId)
  const select = useShelfStore((s) => s.select)
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<DialogState>(null)

  useEffect(() => {
    void useLibraryStore.getState().load()
  }, [])

  const selectedIndex = Math.max(
    0,
    books.findIndex((b) => b.id === selectedBookId),
  )

  async function createBook(values: Parameters<typeof toCreateInput>[0]) {
    const book = await useLibraryStore.getState().createBook(toCreateInput(values))
    if (book) select(book.id)
    return book !== null
  }

  async function deleteBook(book: BookSummary) {
    const confirmed = await confirm({
      title: `Delete “${book.title}”?`,
      message: `This removes the book and its ${book.pageCount === 1 ? 'page' : 'pages'} from this browser. This can’t be undone.`,
      confirmLabel: 'Delete book',
      destructive: true,
    })
    if (!confirmed) return
    const index = books.findIndex((b) => b.id === book.id)
    if (!(await useLibraryStore.getState().deleteBook(book.id))) return
    const remaining = useLibraryStore.getState().books
    select(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
    toast(`Deleted “${book.title}”`)
  }

  return (
    <section className="relative h-full">
      <h1 className="sr-only">Your shelf</h1>
      {status === 'ready' && books.length === 0 && (
        <EmptyShelf onCreate={() => setDialog({ kind: 'create' })} />
      )}
      {books.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setDialog({ kind: 'create' })}
            className="absolute right-6 top-2 z-[1100] inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-sm shadow-sm ring-1 ring-ink/10 hover:shadow-md"
          >
            <PlusIcon width={16} height={16} />
            New book
          </button>
          <ShelfCarousel
            books={books}
            selectedIndex={selectedIndex}
            onSelect={(index) => select(books[index].id)}
            onOpen={(book) => navigate(`/book/${book.id}`)}
            renderSelected={(book) => (
              <SelectedBookChrome
                book={book}
                onOpen={() => navigate(`/book/${book.id}`)}
                onEdit={() => navigate(`/book/${book.id}/edit`)}
                onSettings={() => setDialog({ kind: 'settings', book })}
                onDelete={() => void deleteBook(book)}
              />
            )}
          />
        </>
      )}

      {dialog?.kind === 'create' && (
        <BookFormDialog
          title="New book"
          submitLabel="Create book"
          initialValues={defaultFormValues()}
          onSubmit={createBook}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'settings' && (
        <BookFormDialog
          title="Book settings"
          submitLabel="Save"
          initialValues={formValuesFromBook(dialog.book)}
          pageCount={dialog.book.pageCount}
          onSubmit={(values) =>
            useLibraryStore
              .getState()
              .updateBook(dialog.book.id, toSettings(values, dialog.book.cover))
          }
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}

export default ShelfPage

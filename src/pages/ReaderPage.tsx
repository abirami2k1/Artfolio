import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { AddImageIcon, ArrowLeftIcon, PencilIcon } from '../components/icons'
import { pageCountLabel } from '../domain/format'
import ImportDropzone from '../features/import/ImportDropzone'
import { useImportPicker } from '../features/import/useImportPicker'
import PageGrid from '../features/reader/PageGrid'
import { useBookStore } from '../stores/bookStore'

const PILL =
  'inline-flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-sm shadow-sm ring-1 ring-ink/10 hover:shadow-md'

function ReaderPage() {
  const { id } = useParams()
  const book = useBookStore((s) => s.book)
  const status = useBookStore((s) => s.status)
  const pickImages = useImportPicker()

  useEffect(() => {
    if (!id) return
    void useBookStore.getState().open(id)
    return () => void useBookStore.getState().close()
  }, [id])

  if (status === 'missing') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="font-display text-2xl">This book isn’t on your shelf</p>
        <Link to="/" className="text-accent underline">
          Back to the shelf
        </Link>
      </div>
    )
  }
  if (!book || book.id !== id) return null

  return (
    <ImportDropzone bookId={book.id} bookTitle={book.title} className="h-full">
      <div className="h-full overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-surface/90 px-6 py-4 backdrop-blur">
          <Link to="/" aria-label="Back to the shelf" title="Back to the shelf" className="p-1">
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl">{book.title}</h1>
            <p className="text-sm text-muted">{pageCountLabel(book.pages.length)}</p>
          </div>
          <button type="button" onClick={() => pickImages(book.id)} className={PILL}>
            <AddImageIcon width={16} height={16} />
            Add images
          </button>
          <Link to={`/book/${book.id}/edit`} className={PILL}>
            <PencilIcon width={16} height={16} />
            Edit
          </Link>
        </header>
        <div className="px-6 pb-16 pt-4">
          {book.pages.length === 0 ? (
            <div className="mt-24 text-center">
              <p className="font-display text-2xl">No pages yet</p>
              <p className="mt-2 text-muted">Drop images here, or use “Add images”.</p>
            </div>
          ) : (
            <PageGrid book={book} />
          )}
        </div>
      </div>
    </ImportDropzone>
  )
}

export default ReaderPage

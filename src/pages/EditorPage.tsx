import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import BookEditor from '../features/editor/BookEditor'
import ImportDropzone from '../features/import/ImportDropzone'
import { useBookStore } from '../stores/bookStore'

function EditorPage() {
  const { id } = useParams()
  const book = useBookStore((s) => s.book)
  const status = useBookStore((s) => s.status)

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
      <BookEditor book={book} />
    </ImportDropzone>
  )
}

export default EditorPage

import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useImportStore } from '../../stores/importStore'

interface ImportDropzoneProps {
  /** Book that dropped images are added to; null disables dropping. */
  bookId: string | null
  bookTitle?: string
  className?: string
  children: ReactNode
}

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files')

/** Drop images anywhere inside to add them to the book as pages. */
function ImportDropzone({ bookId, bookTitle, className = '', children }: ImportDropzoneProps) {
  const [over, setOver] = useState(false)
  const depth = useRef(0) // dragenter/leave fire for every child; count to know when we truly left

  function onDragEnter(event: DragEvent) {
    if (!bookId || !hasFiles(event)) return
    event.preventDefault()
    depth.current += 1
    setOver(true)
  }

  function onDragOver(event: DragEvent) {
    if (!bookId || !hasFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave() {
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setOver(false)
  }

  function onDrop(event: DragEvent) {
    if (!bookId || !hasFiles(event)) return
    event.preventDefault()
    depth.current = 0
    setOver(false)
    void useImportStore.getState().importFiles(bookId, [...event.dataTransfer.files])
  }

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-3 z-[1200] flex items-center justify-center rounded-3xl border-2 border-dashed border-accent/70 bg-surface/80 backdrop-blur-sm">
          <p className="font-display text-2xl">
            Drop to add to {bookTitle ? `“${bookTitle}”` : 'this book'}
          </p>
        </div>
      )}
    </div>
  )
}

export default ImportDropzone

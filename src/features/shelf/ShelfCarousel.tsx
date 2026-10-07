import { useDrag, useWheel } from '@use-gesture/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import BookCover from '../../components/BookCover'
import { SHELF_SETTINGS } from '../../domain/config'
import {
  carouselLayout,
  coverBox,
  coverGeometry,
  dragPosition,
  settleCarouselIndex,
  type CoverGeometry,
} from '../../domain/shelf'
import { useViewportSize } from '../../hooks/useViewportSize'
import type { BookSummary } from '../../storage'

const TAP_SLOP_PX = 4

interface ShelfCarouselProps {
  books: BookSummary[]
  selectedIndex: number
  onSelect(index: number): void
  onOpen(book: BookSummary): void
  /** Title, action buttons etc. drawn around the selected cover. */
  renderSelected(book: BookSummary, geometry: CoverGeometry): ReactNode
}

function isTypingOrModal(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return (
    !!target?.closest('input, textarea, select, [contenteditable="true"]') ||
    !!document.querySelector('[aria-modal="true"]')
  )
}

/** Paper-style carousel of closed books: swipe, drag, wheel or arrow keys to move. */
function ShelfCarousel({
  books,
  selectedIndex,
  onSelect,
  onOpen,
  renderSelected,
}: ShelfCarouselProps) {
  const viewport = useViewportSize()
  const reduceMotion = useReducedMotion()
  const [dragging, setDragging] = useState<number | null>(null)
  const draggedRef = useRef(false)
  const wheelMovedRef = useRef(false)
  const count = books.length
  const position = dragging ?? selectedIndex
  const box = coverBox(viewport)

  const select = (index: number) => onSelect(Math.min(Math.max(index, 0), count - 1))

  const bindDrag = useDrag(
    ({ active, first, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (first) draggedRef.current = false
      if (Math.abs(mx) > TAP_SLOP_PX) draggedRef.current = true
      // A press without movement is a tap: leave the selected book (and its buttons) alone.
      if (!draggedRef.current) return
      const next = dragPosition(selectedIndex, mx, viewport, count)
      if (active) {
        setDragging(next)
        return
      }
      setDragging(null)
      select(settleCarouselIndex(selectedIndex, next, -dx * vx, count))
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } },
  )

  const bindWheel = useWheel(({ delta: [x, y], last }) => {
    if (last) {
      wheelMovedRef.current = false
      return
    }
    const delta = Math.abs(x) > Math.abs(y) ? x : y
    if (wheelMovedRef.current || Math.abs(delta) < SHELF_SETTINGS.wheelStepPx / 4) return
    wheelMovedRef.current = true
    select(selectedIndex + Math.sign(delta))
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingOrModal(event)) return
      if (event.key === 'ArrowRight') select(selectedIndex + 1)
      else if (event.key === 'ArrowLeft') select(selectedIndex - 1)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function onCoverClick(index: number) {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    if (index === selectedIndex) onOpen(books[index])
    else select(index)
  }

  const transition =
    dragging !== null
      ? { duration: 0 }
      : reduceMotion
        ? { duration: 0.15 }
        : { type: 'spring' as const, ...SHELF_SETTINGS.spring }

  return (
    <div
      {...bindDrag()}
      {...bindWheel()}
      className="relative h-full w-full cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
      role="listbox"
      aria-label="Books"
      aria-orientation="horizontal"
    >
      {books.map((book, index) => {
        const layout = carouselLayout(index, position, viewport)
        if (!layout.visible) return null
        const geometry = coverGeometry(book, book.pageCount, box)
        const isSelected = index === selectedIndex
        return (
          <div
            key={book.id}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ zIndex: layout.zIndex }}
          >
            <motion.div
              className="pointer-events-auto relative"
              initial={false}
              animate={{ x: layout.x, scale: layout.scale, opacity: layout.opacity }}
              transition={transition}
            >
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={isSelected ? `Open ${book.title}` : book.title}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onCoverClick(index)}
                className="block rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <BookCover book={book} geometry={geometry} />
              </button>
              {isSelected && dragging === null && renderSelected(book, geometry)}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

export default ShelfCarousel

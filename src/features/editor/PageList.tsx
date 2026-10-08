import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo } from 'react'
import { spreadsAfterFiller } from '../../domain/editor'
import type { Book, Page } from '../../domain/types'
import PageThumb from './PageThumb'

const DRAG_START_PX = 6 // below this a press is a click (select), not a reorder

interface PageListProps {
  book: Book
  selectedPageId: string | null
  onSelect(pageId: string): void
  onReorder(from: number, to: number): void
}

interface ItemProps {
  page: Page
  number: number
  book: Book
  selected: boolean
  afterFiller: boolean
  onSelect(pageId: string): void
}

function SortablePage({ page, number, book, selected, afterFiller, onSelect }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative shrink-0 ${isDragging ? 'z-10 opacity-80' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onSelect(page.id)}
        aria-label={`Page ${number}${page.kind === 'spread' ? ' (spread)' : ''}`}
        aria-current={selected ? 'true' : undefined}
        className="flex cursor-grab touch-none flex-col items-center gap-1 rounded-md p-1.5 focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
      >
        <span
          className={`block overflow-hidden rounded-sm shadow-sm ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-ink/10'}`}
        >
          <PageThumb page={page} book={book} />
        </span>
        <span className={`text-xs ${selected ? 'text-accent' : 'text-muted'}`}>
          {number}
          {page.kind === 'spread' && ' · spread'}
        </span>
        {afterFiller && (
          <span
            className="text-[10px] leading-tight text-muted"
            title="A blank page is added before this spread so it starts on a left page"
          >
            + blank before
          </span>
        )}
      </button>
    </li>
  )
}

/** The book's pages as thumbnails: click to select, drag (or keyboard) to reorder. */
function PageList({ book, selectedPageId, onSelect, onReorder }: PageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_START_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = useMemo(() => book.pages.map((page) => page.id), [book.pages])
  const afterFiller = useMemo(() => spreadsAfterFiller(book), [book])

  const number = (id: string | number) => ids.indexOf(String(id)) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up page ${number(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `Page ${number(active.id)} is over position ${number(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `Page ${number(active.id)} moved to position ${number(over.id)}.` : undefined,
    onDragCancel: ({ active }) => `Moving page ${number(active.id)} was cancelled.`,
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    onReorder(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To reorder, press space, use the arrow keys to move the page, then space again.',
        },
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ol
          aria-label="Pages"
          className="flex gap-1 overflow-x-auto p-2 md:flex-col md:items-center md:overflow-y-auto md:overflow-x-hidden"
        >
          {book.pages.map((page, index) => (
            <SortablePage
              key={page.id}
              page={page}
              number={index + 1}
              book={book}
              selected={page.id === selectedPageId}
              afterFiller={afterFiller.has(page.id)}
              onSelect={onSelect}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

export default PageList

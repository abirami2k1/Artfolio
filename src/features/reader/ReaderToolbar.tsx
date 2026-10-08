import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  AddImageIcon,
  ArrowLeftIcon,
  CollapseIcon,
  ExpandIcon,
  GridIcon,
  OpenBookIcon,
  PencilIcon,
} from '../../components/icons'

const BUTTON =
  'flex size-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm ring-1 ring-ink/10 transition hover:shadow-md'

interface ReaderToolbarProps {
  bookId: string
  title: string
  counter: string
  view: 'stack' | 'grid'
  onToggleView(): void
  onAddImages(): void
  fullscreen: { supported: boolean; active: boolean; toggle(): void }
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick(): void
  children: ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={BUTTON}>
      {children}
    </button>
  )
}

/** Top bar: back to the shelf, title and position, view toggle and book actions. */
function ReaderToolbar({
  bookId,
  title,
  counter,
  view,
  onToggleView,
  onAddImages,
  fullscreen,
}: ReaderToolbarProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
      <Link to="/" aria-label="Back to the shelf" title="Back to the shelf" className={BUTTON}>
        <ArrowLeftIcon />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl sm:text-2xl">{title}</h1>
        <p className="text-sm text-muted" aria-live="polite">
          {counter}
        </p>
      </div>
      <ToolButton
        label={view === 'stack' ? 'Show all pages' : 'Back to the book'}
        onClick={onToggleView}
      >
        {view === 'stack' ? <GridIcon /> : <OpenBookIcon />}
      </ToolButton>
      <ToolButton label="Add images" onClick={onAddImages}>
        <AddImageIcon />
      </ToolButton>
      <Link
        to={`/book/${bookId}/edit`}
        aria-label="Edit pages"
        title="Edit pages"
        className={BUTTON}
      >
        <PencilIcon />
      </Link>
      {fullscreen.supported && (
        <ToolButton
          label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
          onClick={fullscreen.toggle}
        >
          {fullscreen.active ? <CollapseIcon /> : <ExpandIcon />}
        </ToolButton>
      )}
    </header>
  )
}

export default ReaderToolbar

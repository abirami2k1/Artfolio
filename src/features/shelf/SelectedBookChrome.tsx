import type { ReactNode } from 'react'
import {
  AddImageIcon,
  MoreIcon,
  OpenBookIcon,
  PencilIcon,
  SettingsIcon,
} from '../../components/icons'
import Menu from '../../components/Menu'
import { pageCountLabel } from '../../domain/format'
import type { BookSummary } from '../../storage'

const ROUND_BUTTON =
  'flex size-11 items-center justify-center rounded-full bg-paper text-ink shadow-md ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0'

interface SelectedBookChromeProps {
  book: BookSummary
  onOpen(): void
  onAddImages(): void
  onEdit(): void
  onSettings(): void
  onDelete(): void
}

function ActionButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick?(): void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={ROUND_BUTTON}
    >
      {children}
    </button>
  )
}

/** Title and page count above the selected cover, actions beside it, settings on its corner. */
function SelectedBookChrome({
  book,
  onOpen,
  onAddImages,
  onEdit,
  onSettings,
  onDelete,
}: SelectedBookChromeProps) {
  return (
    <>
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-6 w-max max-w-[80vw] -translate-x-1/2 text-center">
        <h2 className="truncate font-display text-2xl">{book.title}</h2>
        <p className="mt-1 text-sm text-muted">{pageCountLabel(book.pageCount)}</p>
      </div>

      <button
        type="button"
        aria-label="Book settings"
        title="Book settings"
        onClick={onSettings}
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/15 text-white backdrop-blur-sm transition hover:bg-black/30"
      >
        <SettingsIcon width={16} height={16} />
      </button>

      <div className="absolute left-full top-1/2 ml-5 flex -translate-y-1/2 flex-col gap-3">
        <ActionButton label="Open" onClick={onOpen}>
          <OpenBookIcon />
        </ActionButton>
        <ActionButton label="Add images" onClick={onAddImages}>
          <AddImageIcon />
        </ActionButton>
        <ActionButton label="Edit pages" onClick={onEdit}>
          <PencilIcon />
        </ActionButton>
        <Menu
          label="More actions"
          trigger={<MoreIcon />}
          triggerClassName={ROUND_BUTTON}
          items={[
            { label: 'Book settings', onSelect: onSettings },
            { label: 'Delete book…', onSelect: onDelete, destructive: true },
          ]}
        />
      </div>
    </>
  )
}

export default SelectedBookChrome

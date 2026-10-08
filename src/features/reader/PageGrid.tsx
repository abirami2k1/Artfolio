import RenderPageView from '../../components/RenderPageView'
import { PAGE_GRID } from '../../domain/config'
import { insidePageNumbers } from '../../domain/pages'
import { pageSizeForWidth } from '../../domain/shape'
import type { Book, RenderPage } from '../../domain/types'

interface PageGridProps {
  book: Book
  /** Every render page, covers included, in reading order. */
  pages: RenderPage[]
  /** Keys of the pages on the current spread (highlighted). */
  currentKeys: ReadonlySet<string>
  onSelect(pageKey: string): void
}

function labels(page: RenderPage, number: number | null): { short: string; full: string } {
  if (number !== null) return { short: String(number), full: `Page ${number}` }
  return page.kind === 'front-cover'
    ? { short: 'Cover', full: 'Cover' }
    : { short: 'Back', full: 'Back cover' }
}

/** All pages as thumbnails drawn by the shared renderer; tap one to read from there. */
function PageGrid({ book, pages, currentKeys, onSelect }: PageGridProps) {
  const size = pageSizeForWidth(book, PAGE_GRID.thumbWidthPx)
  const numbers = insidePageNumbers(pages)

  return (
    <ol
      className="grid justify-center gap-x-6 gap-y-8"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${size.width}px)` }}
    >
      {pages.map((page, index) => {
        const label = labels(page, numbers[index])
        const current = currentKeys.has(page.key)
        return (
          <li key={page.key}>
            <button
              type="button"
              onClick={() => onSelect(page.key)}
              aria-label={label.full}
              aria-current={current ? 'page' : undefined}
              className="group flex flex-col items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span
                className={`block overflow-hidden rounded-sm shadow-md transition group-hover:-translate-y-0.5 group-hover:shadow-lg ${current ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-ink/5'}`}
              >
                <RenderPageView item={page} book={book} size={size} variant="thumb" />
              </span>
              <span className={`text-xs ${current ? 'text-accent' : 'text-muted'}`}>
                {label.short}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default PageGrid

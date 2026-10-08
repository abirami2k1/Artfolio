import { useMemo } from 'react'
import PageRenderer from '../../components/PageRenderer'
import { PAGE_GRID } from '../../domain/config'
import { expandToRenderPages } from '../../domain/pages'
import { pageSizeForWidth } from '../../domain/shape'
import type { Book, RenderPage, Size } from '../../domain/types'
import { useImageAsset } from '../../hooks/useImageAsset'

type InsidePage = Extract<RenderPage, { kind: 'page' | 'spread-half' | 'filler' }>

const isInside = (page: RenderPage): page is InsidePage =>
  page.kind !== 'front-cover' && page.kind !== 'back-cover'

function GridPage({ book, item, size }: { book: Book; item: InsidePage; size: Size }) {
  const page = item.kind === 'filler' ? null : item.page
  const asset = useImageAsset(page?.imageId)
  if (!page) {
    return <div style={{ ...size, backgroundColor: book.paperColor }} />
  }
  return (
    <PageRenderer
      size={size}
      page={page}
      imageSize={asset}
      paperColor={book.paperColor}
      half={item.kind === 'spread-half' ? item.half : undefined}
      variant="thumb"
    />
  )
}

/** Every inside page as a thumbnail, drawn by the shared PageRenderer. */
function PageGrid({ book }: { book: Book }) {
  const pages = useMemo(() => expandToRenderPages(book, 'single').pages.filter(isInside), [book])
  const size = pageSizeForWidth(book, PAGE_GRID.thumbWidthPx)

  return (
    <ol
      className="grid justify-center gap-x-6 gap-y-8"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${size.width}px)` }}
    >
      {pages.map((item, index) => (
        <li key={item.key} className="flex flex-col items-center gap-2">
          <div className="overflow-hidden rounded-sm shadow-md ring-1 ring-ink/5">
            <GridPage book={book} item={item} size={size} />
          </div>
          <span className="text-xs text-muted">{index + 1}</span>
        </li>
      ))}
    </ol>
  )
}

export default PageGrid

import { memo } from 'react'
import PageRenderer from '../../components/PageRenderer'
import { EDITOR_SETTINGS } from '../../domain/config'
import { pageSizeForWidth } from '../../domain/shape'
import type { Book, Page } from '../../domain/types'
import { useImageAsset } from '../../hooks/useImageAsset'

interface PageThumbProps {
  page: Page
  book: Pick<Book, 'shape' | 'orientation' | 'paperColor'>
}

/** A stored page as a thumbnail; a spread shows both of its halves. */
function PageThumb({ page, book }: PageThumbProps) {
  const size = pageSizeForWidth(book, EDITOR_SETTINGS.thumbWidthPx)
  const asset = useImageAsset(page.imageId)
  const shared = {
    size,
    page,
    imageSize: asset,
    paperColor: book.paperColor,
    variant: 'thumb',
  } as const

  if (page.kind === 'spread') {
    return (
      <span className="flex">
        <PageRenderer {...shared} half="left" />
        <PageRenderer {...shared} half="right" />
      </span>
    )
  }
  return <PageRenderer {...shared} />
}

// Unchanged pages keep their identity through edits, so only the edited thumb re-renders.
export default memo(PageThumb)

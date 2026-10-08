import type { Book, RenderPage, Size } from '../domain/types'
import { useImageAsset } from '../hooks/useImageAsset'
import type { ImageVariant } from '../storage'
import CoverFace from './CoverFace'
import PageRenderer from './PageRenderer'

interface RenderPageViewProps {
  item: RenderPage
  book: Pick<Book, 'title' | 'cover' | 'paperColor'>
  size: Size
  variant?: ImageVariant
}

/** Any render page at `size`: a cover, an image or blank page, a spread half or a filler. */
function RenderPageView({ item, book, size, variant = 'display' }: RenderPageViewProps) {
  const page = item.kind === 'page' || item.kind === 'spread-half' ? item.page : null
  const asset = useImageAsset(page?.imageId)

  if (item.kind === 'front-cover' || item.kind === 'back-cover') {
    return (
      <div className="relative" style={size}>
        <CoverFace
          book={book}
          side={item.kind === 'front-cover' ? 'front' : 'back'}
          variant={variant}
        />
      </div>
    )
  }
  if (!page) return <div style={{ ...size, backgroundColor: book.paperColor }} />
  return (
    <PageRenderer
      size={size}
      page={page}
      imageSize={asset}
      paperColor={book.paperColor}
      half={item.kind === 'spread-half' ? item.half : undefined}
      variant={variant}
    />
  )
}

export default RenderPageView

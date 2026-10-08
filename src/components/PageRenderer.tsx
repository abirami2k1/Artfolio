import { computePagePlacement } from '../domain/layout'
import type { Page, Size, SpreadHalf } from '../domain/types'
import { useImageUrl } from '../hooks/useImageUrl'
import type { ImageVariant } from '../storage'

interface PageRendererProps {
  /** Page size in px. */
  size: Size
  page: Page
  /** Natural size of the page's image (from its ImageAsset); null while unknown. */
  imageSize: Size | null
  /** Used when the page has no background of its own. */
  paperColor: string
  /** Which half of a spread image this page shows. */
  half?: SpreadHalf
  /** 'thumb' for grids and page lists; placement is identical, only the blob differs. */
  variant?: ImageVariant
  className?: string
}

/**
 * The one component that draws a page, for the reader and the editor alike: background, then
 * the image clipped to the content box inside the margin. All geometry comes from the domain.
 */
function PageRenderer({
  size,
  page,
  imageSize,
  paperColor,
  half,
  variant = 'display',
  className = '',
}: PageRendererProps) {
  const imageUrl = useImageUrl(page.imageId, variant)
  const placement = imageSize ? computePagePlacement(size, imageSize, page, half) : null
  const frame = placement?.frame

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: size.width,
        height: size.height,
        backgroundColor: page.background ?? paperColor,
      }}
      data-testid="page"
    >
      {placement && frame && imageUrl && (
        <div
          className="absolute overflow-hidden"
          style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height }}
          data-testid="page-frame"
        >
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              // the frame is the positioning parent, so shift from page to frame coordinates
              left: placement.left - frame.left,
              top: placement.top - frame.top,
              width: placement.width,
              height: placement.height,
              transform: placement.rotation ? `rotate(${placement.rotation}deg)` : undefined,
            }}
          />
        </div>
      )}
    </div>
  )
}

export default PageRenderer

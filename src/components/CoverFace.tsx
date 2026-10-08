import { readableTextColor } from '../domain/color'
import type { Book } from '../domain/types'
import { useImageUrl } from '../hooks/useImageUrl'
import type { ImageVariant } from '../storage'

interface CoverFaceProps {
  book: Pick<Book, 'title' | 'cover'>
  /** The front shows the image and title; the back is the plain cover color. */
  side?: 'front' | 'back'
  variant?: ImageVariant
}

/**
 * The outside of a cover, filling its parent: color or image, a crease along the spine, a soft
 * sheen and the title. Sizes are container units, so it scales with whatever box it's in.
 */
function CoverFace({ book, side = 'front', variant = 'thumb' }: CoverFaceProps) {
  const isFront = side === 'front'
  const imageUrl = useImageUrl(isFront ? book.cover.imageId : undefined, variant)

  return (
    <div className="absolute inset-0 [container-type:size]">
      <div
        className={`absolute inset-0 overflow-hidden ${isFront ? 'rounded-l-[1cqw] rounded-r-[4cqw]' : 'rounded-l-[4cqw] rounded-r-[1cqw]'}`}
        style={{ backgroundColor: book.cover.color }}
      >
        {imageUrl && (
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/* spine crease and a soft sheen */}
        <div
          className={`absolute inset-y-0 w-[7cqw] from-black/25 via-black/5 to-transparent ${isFront ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10" />
        {isFront && book.cover.showTitle && (
          <p
            className="absolute inset-x-[12cqw] top-[14cqh] text-center font-display text-[9cqw] leading-tight"
            style={{ color: readableTextColor(book.cover.color) }}
          >
            {book.title}
          </p>
        )}
      </div>
    </div>
  )
}

export default CoverFace

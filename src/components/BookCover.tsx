import { readableTextColor } from '../domain/color'
import type { CoverGeometry } from '../domain/shelf'
import type { Book } from '../domain/types'
import { useImageUrl } from '../hooks/useImageUrl'

interface BookCoverProps {
  book: Pick<Book, 'title' | 'cover' | 'paperColor'>
  geometry: CoverGeometry
}

/**
 * A closed book: page edges along the spine (thickness from the domain), the cover with
 * rounded open-edge corners, and a soft shadow. Sizes come from `coverGeometry`; the title and
 * corner radius scale with the cover via container units.
 */
function BookCover({ book, geometry }: BookCoverProps) {
  const imageUrl = useImageUrl(book.cover.imageId, 'thumb')
  const textColor = readableTextColor(book.cover.color)

  return (
    <div
      className="relative drop-shadow-[0_10px_18px_rgba(43,39,36,0.22)]"
      style={{ width: geometry.width + geometry.thickness, height: geometry.height }}
    >
      {/* page edges, visible along the spine */}
      <div
        className="absolute inset-y-[1.5%] left-0 right-1/2 rounded-l-[2px] shadow-[inset_1px_0_2px_rgba(0,0,0,0.12)]"
        style={{
          backgroundColor: book.paperColor,
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(43,39,36,0.10) 0 1px, transparent 1px 3px)',
        }}
      />
      {/* outer box is the size container, so cqw/cqh below are relative to the cover */}
      <div
        className="absolute inset-y-0 right-0 [container-type:size]"
        style={{ width: geometry.width }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-l-[1cqw] rounded-r-[4cqw]"
          style={{ backgroundColor: book.cover.color }}
        >
          {imageUrl && (
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {/* spine crease and a soft sheen */}
          <div className="absolute inset-y-0 left-0 w-[7cqw] bg-gradient-to-r from-black/25 via-black/5 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10" />
          {book.cover.showTitle && (
            <p
              className="absolute inset-x-[12cqw] top-[14cqh] text-center font-display text-[9cqw] leading-tight"
              style={{ color: textColor }}
            >
              {book.title}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookCover

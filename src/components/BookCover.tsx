import type { CoverGeometry } from '../domain/shelf'
import type { Book } from '../domain/types'
import CoverFace from './CoverFace'

interface BookCoverProps {
  book: Pick<Book, 'title' | 'cover' | 'paperColor'>
  geometry: CoverGeometry
}

/**
 * A closed book: page edges along the spine (thickness from the domain), the cover with
 * rounded open-edge corners, and a soft shadow. Sizes come from `coverGeometry`.
 */
function BookCover({ book, geometry }: BookCoverProps) {
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
      <div className="absolute inset-y-0 right-0" style={{ width: geometry.width }}>
        <CoverFace book={book} />
      </div>
    </div>
  )
}

export default BookCover

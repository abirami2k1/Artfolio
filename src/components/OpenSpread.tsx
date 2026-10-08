import { motion, useTransform, type MotionValue } from 'framer-motion'
import { READER_SETTINGS } from '../domain/config'
import { spreadBend } from '../domain/stack'
import type { Book, RenderPage, Size, Spread } from '../domain/types'
import type { ImageVariant } from '../storage'
import RenderPageView from './RenderPageView'

type Side = 'left' | 'right'

interface OpenSpreadProps {
  spread: Spread
  book: Pick<Book, 'title' | 'cover' | 'paperColor'>
  pageSize: Size
  /** The spread's offset from the top of the stack (see `stackLayout`); drives the bend. */
  offset: MotionValue<number>
  variant?: ImageVariant
  /** Lie flat (zoom view): no bow, no extra bend. */
  flat?: boolean
  /** Opacity of each inside half (see `insideSideOpacity`); covers are always shown. */
  sideOpacity?: Record<Side, MotionValue<number>>
}

const isCover = (page: RenderPage) => page.kind === 'front-cover' || page.kind === 'back-cover'

// Crease shading: darkest at the spine, fading toward the outer edge.
const CREASE: Record<Side, string> = {
  left: 'linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 5%, transparent 24%)',
  right: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 5%, transparent 24%)',
}

interface HalfProps {
  side: Side
  item: RenderPage | null
  book: OpenSpreadProps['book']
  pageSize: Size
  rotateY: MotionValue<number>
  shade: MotionValue<number>
  variant: ImageVariant
  opacity?: MotionValue<number>
}

/** One page of an open spread, hinged at the spine. Covers lie closed and flat. */
function Half({ side, item, book, pageSize, rotateY, shade, variant, opacity }: HalfProps) {
  if (!item) return <div style={pageSize} />
  if (isCover(item)) {
    return (
      <div className="drop-shadow-[0_14px_24px_rgba(43,39,36,0.25)]">
        <RenderPageView item={item} book={book} size={pageSize} variant={variant} />
      </div>
    )
  }
  const outer = side === 'left' ? 'rounded-l-lg' : 'rounded-r-lg'
  return (
    <motion.div
      className={`relative overflow-hidden ${outer} shadow-[0_14px_28px_rgba(43,39,36,0.22)]`}
      style={{
        rotateY,
        opacity,
        transformOrigin: side === 'left' ? 'right center' : 'left center',
      }}
    >
      <RenderPageView item={item} book={book} size={pageSize} variant={variant} />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: CREASE[side], opacity: shade }}
      />
    </motion.div>
  )
}

/**
 * An open book: two pages bowed toward the spine (each tilted in 3D per `spreadBend`) with
 * crease shading, rounded outer corners and a soft shadow. In single mode one page is drawn
 * hinged on its left edge.
 */
function OpenSpread({
  spread,
  book,
  pageSize,
  offset,
  variant = 'display',
  flat = false,
  sideOpacity,
}: OpenSpreadProps) {
  const bend = (o: number) => spreadBend(flat ? 0 : o)
  const leftRotateY = useTransform(offset, (o) => (flat ? 0 : bend(o).leftRotateY))
  const rightRotateY = useTransform(offset, (o) => (flat ? 0 : bend(o).rightRotateY))
  const shade = useTransform(offset, (o) => bend(o).shade)
  const shared = { book, pageSize, shade, variant }

  return (
    <div className="flex" style={{ perspective: READER_SETTINGS.perspectivePx }}>
      {spread.kind === 'single' ? (
        <Half side="right" item={spread.page} rotateY={rightRotateY} {...shared} />
      ) : (
        <>
          <Half
            side="left"
            item={spread.left}
            rotateY={leftRotateY}
            opacity={sideOpacity?.left}
            {...shared}
          />
          <Half
            side="right"
            item={spread.right}
            rotateY={rightRotateY}
            opacity={sideOpacity?.right}
            {...shared}
          />
        </>
      )}
    </div>
  )
}

export default OpenSpread

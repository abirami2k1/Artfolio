import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import {
  insideSideOpacity,
  loadsFullImages,
  mountedSpreadRange,
  spreadSize,
  stackLayout,
} from '../domain/stack'
import type { Book, Size, Spread, ViewMode } from '../domain/types'
import OpenSpread from './OpenSpread'

interface SpreadStackProps {
  spreads: Spread[]
  book: Pick<Book, 'title' | 'cover' | 'paperColor'>
  pageSize: Size
  mode: ViewMode
  /** The spread the reader is on. */
  currentIndex: number
  /** Continuous stack position: `currentIndex` at rest, fractional while dragging or settling. */
  position: MotionValue<number>
  /** Cross-fade between spreads instead of sliding and bending. */
  reduceMotion?: boolean
}

interface LayerProps extends Omit<SpreadStackProps, 'spreads' | 'reduceMotion'> {
  spread: Spread
  index: number
  width: number
  count: number
}

/** One spread in the stack; every transform comes from `stackLayout` as the position moves. */
function StackLayer({ spread, index, width, count, position, currentIndex, ...rest }: LayerProps) {
  const layout = (p: number) => stackLayout(index, p, 0, width)
  const x = useTransform(position, (p) => layout(p).x)
  const scale = useTransform(position, (p) => layout(p).scale)
  const opacity = useTransform(position, (p) => layout(p).opacity)
  const zIndex = useTransform(position, (p) => layout(p).zIndex)
  const visibility = useTransform(position, (p) => (layout(p).visible ? 'visible' : 'hidden'))
  const offset = useTransform(position, (p) => index - p)
  const left = useTransform(position, (p) => insideSideOpacity(p, count, rest.mode).left)
  const right = useTransform(position, (p) => insideSideOpacity(p, count, rest.mode).right)

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ zIndex, visibility }}
      aria-hidden={index !== currentIndex}
    >
      <motion.div style={{ x, scale, opacity }}>
        <OpenSpread
          spread={spread}
          offset={offset}
          variant={loadsFullImages(index, currentIndex) ? 'display' : 'thumb'}
          sideOpacity={{ left, right }}
          {...rest}
        />
      </motion.div>
    </motion.div>
  )
}

/** The current spread on top, a few previous/next spreads stacked beneath it (Paper style). */
function SpreadStack({ spreads, reduceMotion = false, ...props }: SpreadStackProps) {
  const rest = useMotionValue(0)
  const { width } = spreadSize(props.pageSize, props.mode)

  if (reduceMotion) {
    const spread = spreads[props.currentIndex]
    return (
      <AnimatePresence initial={false}>
        {spread && (
          <motion.div
            key={spread.key}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <OpenSpread spread={spread} offset={rest} book={props.book} pageSize={props.pageSize} />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  const [from, to] = mountedSpreadRange(props.currentIndex, spreads.length)
  return (
    <>
      {spreads.slice(from, to + 1).map((spread, k) => (
        <StackLayer
          key={spread.key}
          spread={spread}
          index={from + k}
          width={width}
          count={spreads.length}
          {...props}
        />
      ))}
    </>
  )
}

export default SpreadStack

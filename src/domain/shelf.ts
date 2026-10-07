import { BOOK_THICKNESS, SHELF_SETTINGS } from './config'
import { pageAspect } from './shape'
import type { Book, Size } from './types'

export interface CoverLayout {
  x: number // px offset of the cover center from the carousel center
  scale: number
  zIndex: number
  opacity: number
  visible: boolean
}

export interface CoverGeometry extends Size {
  thickness: number // px width of the page-edge strip along the spine
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The box the selected cover fits in, from the viewport. */
export function coverBox(viewport: Size): Size {
  const { widthShare, heightShare, maxWidthPx } = SHELF_SETTINGS.coverBox
  return {
    width: Math.min(viewport.width * widthShare, maxWidthPx),
    height: viewport.height * heightShare,
  }
}

/** Page-edge thickness as a share of cover height: grows with page count, within limits. */
export function bookThickness(pageCount: number): number {
  const { minShare, maxShare, perPageShare } = BOOK_THICKNESS
  return clamp(minShare + perPageShare * Math.max(0, pageCount), minShare, maxShare)
}

/** Closed book at its true proportions, fitted (with its page edges) inside `box`. */
export function coverGeometry(
  book: Pick<Book, 'shape' | 'orientation'>,
  pageCount: number,
  box: Size,
): CoverGeometry {
  const aspect = pageAspect(book)
  const share = bookThickness(pageCount)
  // total width = height × (aspect + share): fit that inside the box
  const height = Math.min(box.height, box.width / (aspect + share))
  return { width: height * aspect, height, thickness: height * share }
}

/**
 * Where cover `index` sits when the carousel is at `position` (the selected index, fractional
 * while dragging). The selected cover is centered and full size; neighbors step aside, shrink,
 * sit behind and fade; covers beyond SHELF_SETTINGS.visibleNeighbors are hidden.
 */
export function carouselLayout(index: number, position: number, viewport: Size): CoverLayout {
  const { neighborOffset, neighborScale, visibleNeighbors, neighborOpacity } = SHELF_SETTINGS
  const offset = index - position
  const distance = Math.abs(offset)
  const near = Math.min(distance, 1)
  const fade = clamp((visibleNeighbors + 1 - distance) / visibleNeighbors, 0, 1)
  return {
    x: offset * neighborOffset * coverBox(viewport).width,
    scale: 1 - (1 - neighborScale) * near,
    zIndex: Math.round(1000 - distance * 10),
    opacity: distance <= 1 ? 1 - (1 - neighborOpacity) * near : neighborOpacity * fade,
    visible: distance < visibleNeighbors + 1,
  }
}

/**
 * Index to settle on after a drag ends at `position` with horizontal `velocity` (px/ms, positive
 * = moving toward later books). A flick moves at least one book; result stays in range.
 */
export function settleCarouselIndex(
  startIndex: number,
  position: number,
  velocity: number,
  count: number,
): number {
  if (count <= 0) return 0
  let target = Math.round(position)
  if (target === startIndex && Math.abs(velocity) >= SHELF_SETTINGS.flickVelocity) {
    target = startIndex + Math.sign(velocity)
  }
  return clamp(target, 0, count - 1)
}

/**
 * Carousel position for a horizontal drag of `dragPx` starting at `startIndex`; dragging left
 * moves toward later books. Stretches at most SHELF_SETTINGS.overscroll past either end.
 */
export function dragPosition(
  startIndex: number,
  dragPx: number,
  viewport: Size,
  count: number,
): number {
  const step = SHELF_SETTINGS.neighborOffset * coverBox(viewport).width
  const position = step > 0 ? startIndex - dragPx / step : startIndex
  const { overscroll } = SHELF_SETTINGS
  return clamp(position, -overscroll, Math.max(0, count - 1) + overscroll)
}

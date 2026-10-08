import { READER_SETTINGS, STACK_SETTINGS } from './config'
import type { RenderPage, Size, Spread, ViewMode } from './types'

export interface StackLayer {
  x: number // px offset of the spread center from the stack center
  scale: number
  zIndex: number
  opacity: number
  visible: boolean
}

export interface SpreadBend {
  /** rotateY (deg) of each half around the spine; positive tilts the left half's outer edge up. */
  leftRotateY: number
  rightRotateY: number
  /** Crease shading strength, 0–1. */
  shade: number
}

/** The blank partner given to an odd last page in 'spread' mode; not counted as a page. */
export const END_FILLER_KEY = 'filler:end'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const noNegativeZero = (value: number) => (value === 0 ? 0 : value)

/**
 * Group render pages into what the reader shows at once. 'spread' mode: the front cover lies
 * closed on the right, inside pages pair up left/right (an odd last page gets a blank partner),
 * the back cover lies closed on the left. 'single' mode: one page at a time.
 */
export function groupIntoSpreads(pages: readonly RenderPage[], mode: ViewMode): Spread[] {
  if (mode === 'single') return pages.map((page) => ({ kind: 'single', key: page.key, page }))

  const spreads: Spread[] = []
  const inside: RenderPage[] = []
  for (const page of pages) {
    if (page.kind === 'front-cover') {
      spreads.push({ kind: 'pair', key: page.key, left: null, right: page })
    } else if (page.kind !== 'back-cover') {
      inside.push(page)
    }
  }
  if (inside.length % 2 === 1) inside.push({ kind: 'filler', key: END_FILLER_KEY })
  for (let i = 0; i < inside.length; i += 2) {
    const [left, right] = [inside[i], inside[i + 1]]
    spreads.push({ kind: 'pair', key: `${left.key}|${right.key}`, left, right })
  }
  const back = pages.find((page) => page.kind === 'back-cover')
  if (back) spreads.push({ kind: 'pair', key: back.key, left: back, right: null })
  return spreads
}

/**
 * Where spread `spreadIndex` sits in the stack when the reader is at `currentIndex`, dragged by
 * `dragProgress` spreads (positive = toward later spreads). The current spread is on top at
 * full size; later spreads wait underneath, each edge peeking `layerOffsetPx` out on the
 * right; earlier ones lie on a pile peeking out on the left. A spread moving to (or back from) the earlier pile lifts and
 * slides out by `travel` spread widths so the one beneath is revealed; anything moving between
 * the current position and the later pile just settles in place.
 */
export function stackLayout(
  spreadIndex: number,
  currentIndex: number,
  dragProgress: number,
  spreadWidth: number,
): StackLayer {
  const { visibleLayers, layerOffsetPx, layerScaleStep, travel, liftScale } = STACK_SETTINGS
  const offset = spreadIndex - currentIndex - dragProgress
  const distance = Math.abs(offset)
  const side = Math.sign(offset)
  const lift = offset < 0 && distance < 1 ? Math.sin(Math.PI * distance) : 0
  const layer = Math.min(distance, visibleLayers)
  const layerScale = 1 - layerScaleStep * layer
  // each layer's edge peeks out by layerOffsetPx beyond the (shrunken) layer above it
  const peek = layerOffsetPx * layer + ((1 - layerScale) * spreadWidth) / 2
  return {
    x: noNegativeZero(side * (peek + travel * spreadWidth * lift)),
    scale: layerScale * (1 + liftScale * lift),
    zIndex: Math.round(1000 - distance * 100),
    opacity: clamp(visibleLayers + 1 - distance, 0, 1),
    visible: distance < visibleLayers + 1,
  }
}

/**
 * How an open spread bows. `progress` is the spread's offset from the top of the stack
 * (as in `stackLayout`, clamped to −1…1): at rest each half tilts `restBowDeg` toward the
 * spine; mid-move it bends up to `dragBowDeg` more, mostly on the half being lifted (the right
 * half when sliding left, the left half when sliding right), and the crease darkens.
 */
export function spreadBend(progress: number): SpreadBend {
  const { restBowDeg, dragBowDeg, trailingBendShare, restShade, dragShade } = STACK_SETTINGS
  const p = clamp(progress, -1, 1)
  const peak = Math.sin(Math.PI * Math.abs(p)) // 0 at rest, 1 mid-move
  const extra = dragBowDeg * peak
  const liftRight = p < 0
  const leading = restBowDeg + extra
  const trailing = restBowDeg + extra * trailingBendShare
  return {
    leftRotateY: liftRight ? trailing : leading,
    rightRotateY: -(liftRight ? leading : trailing),
    shade: restShade + dragShade * peak,
  }
}

/** Size in px of what the reader shows at once: two pages side by side, or one. */
export function spreadSize(pageSize: Size, mode: ViewMode): Size {
  return { width: mode === 'spread' ? pageSize.width * 2 : pageSize.width, height: pageSize.height }
}

/** The pages a spread shows, left to right. */
export function spreadPages(spread: Spread): RenderPage[] {
  if (spread.kind === 'single') return [spread.page]
  return [spread.left, spread.right].filter((page): page is RenderPage => page !== null)
}

/** A page key that identifies where the reader is, stable across spread/single switches. */
export function spreadAnchorKey(spread: Spread): string {
  return spreadPages(spread)[0].key
}

/** Index of the spread showing the page with `pageKey`; 0 when it isn't there. */
export function spreadIndexForPage(spreads: readonly Spread[], pageKey: string | null): number {
  if (!pageKey) return 0
  const index = spreads.findIndex((spread) => spreadPages(spread).some((p) => p.key === pageKey))
  return Math.max(0, index)
}

/**
 * Stack position (fractional spread index) for a horizontal drag of `dragPx` from
 * `startIndex`: dragging a full spread width left moves one spread on. Moves at most one
 * spread per drag, and stretches at most STACK_SETTINGS.overscroll past either end.
 */
export function stackDragPosition(
  startIndex: number,
  dragPx: number,
  spreadWidth: number,
  count: number,
): number {
  const { overscroll } = STACK_SETTINGS
  const moved = spreadWidth > 0 ? clamp(-dragPx / spreadWidth, -1, 1) : 0
  return clamp(startIndex + moved, -overscroll, Math.max(0, count - 1) + overscroll)
}

/**
 * Spread to settle on after a drag ends at `position` with horizontal `velocity` (px/ms,
 * positive = toward later spreads): one spread on once the drag passes
 * STACK_SETTINGS.swipeThreshold or is flicked; otherwise back where it started.
 */
export function settleStackIndex(
  startIndex: number,
  position: number,
  velocity: number,
  count: number,
): number {
  if (count <= 0) return 0
  const { swipeThreshold, flickVelocity } = STACK_SETTINGS
  const moved = position - startIndex
  let step = 0
  if (Math.abs(moved) >= swipeThreshold) step = Math.sign(moved)
  else if (Math.abs(velocity) >= flickVelocity && Math.sign(velocity) === Math.sign(moved)) {
    step = Math.sign(velocity)
  }
  return clamp(startIndex + step, 0, count - 1)
}

/** Range of spread indexes worth mounting around `currentIndex` (the visible layers + 1). */
export function mountedSpreadRange(currentIndex: number, count: number): [number, number] {
  const reach = STACK_SETTINGS.visibleLayers + 1
  return [Math.max(0, currentIndex - reach), Math.min(count - 1, currentIndex + reach)]
}

/** Spreads near the current one load full-size images; the rest use thumbnails. */
export function loadsFullImages(spreadIndex: number, currentIndex: number): boolean {
  return Math.abs(spreadIndex - currentIndex) <= STACK_SETTINGS.displayRadius
}

/**
 * "Cover", "Back cover", "Page 3 of 12", "Pages 3–4 of 12". Fillers that keep spreads paired
 * count as pages; the blank partner of an odd last page doesn't.
 */
export function spreadCounterLabel(spreads: readonly Spread[], index: number): string {
  const spread = spreads[index]
  if (!spread) return ''
  const isInside = (page: RenderPage) =>
    page.kind !== 'front-cover' && page.kind !== 'back-cover' && page.key !== END_FILLER_KEY
  const inside = spreads.flatMap(spreadPages).filter(isInside)
  const shown = spreadPages(spread).filter(isInside)
  if (shown.length === 0)
    return spreadPages(spread)[0].kind === 'front-cover' ? 'Cover' : 'Back cover'
  const numbers = shown.map((page) => inside.indexOf(page) + 1)
  const first = numbers[0]
  const last = numbers[numbers.length - 1]
  const range = first === last ? `Page ${first}` : `Pages ${first}–${last}`
  return `${range} of ${inside.length}`
}

/** Tapping near the left edge goes back (−1), near the right edge forward (1), else 0. */
export function edgeTapStep(x: number, width: number): -1 | 0 | 1 {
  if (width <= 0) return 0
  const share = x / width
  const { edgeTapShare } = READER_SETTINGS
  if (share < edgeTapShare) return -1
  if (share > 1 - edgeTapShare) return 1
  return 0
}

/**
 * Opacity of the left and right halves of inside spreads at stack `position`. A closed cover
 * lies on one side only, so under the front cover just the right halves (the page block's
 * edge) show; they open up as the cover slides away. The back cover mirrors this.
 */
export function insideSideOpacity(
  position: number,
  count: number,
  mode: ViewMode,
): { left: number; right: number } {
  if (mode === 'single') return { left: 1, right: 1 }
  return { left: clamp(position, 0, 1), right: clamp(count - 1 - position, 0, 1) }
}

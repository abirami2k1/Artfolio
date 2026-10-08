import { findPreset } from './book'
import { DISPLAY_SIZES, SPREAD_BREAKPOINT_PX, SPREAD_MIN_VIEWPORT_ASPECT } from './config'
import type { Book, Size, ViewMode } from './types'

/**
 * Page width ÷ height. Uses the preset's ratio when the preset is known (so tuning a preset
 * updates existing books), else the book's stored ratio. Portrait is always taller than wide,
 * landscape always wider than tall.
 */
export function pageAspect(book: Pick<Book, 'shape' | 'orientation'>): number {
  const { ratioW, ratioH } = findPreset(book.shape.presetId) ?? book.shape
  const long = Math.max(ratioW, ratioH)
  const short = Math.min(ratioW, ratioH)
  return book.orientation === 'portrait' ? short / long : long / short
}

/**
 * Size in px of ONE page so the open book (two pages in 'spread' mode) fits inside the share
 * of the viewport set by the book's display size, keeping the page aspect.
 */
export function computeBookSize(
  viewport: Size,
  book: Pick<Book, 'shape' | 'orientation' | 'displaySize'>,
  mode: ViewMode,
): Size {
  if (viewport.width <= 0 || viewport.height <= 0) return { width: 0, height: 0 }
  const share = DISPLAY_SIZES[book.displaySize]
  const aspect = pageAspect(book)
  const pagesAcross = mode === 'spread' ? 2 : 1
  const maxWidth = (viewport.width * share) / pagesAcross
  const maxHeight = viewport.height * share
  // Round the axis that limits the size, then derive the other from it.
  if (maxWidth <= maxHeight * aspect) {
    const width = Math.floor(maxWidth)
    return { width, height: Math.floor(width / aspect) }
  }
  const height = Math.floor(maxHeight)
  return { width: Math.floor(height * aspect), height }
}

/** Two-page spreads on wide, landscape-ish viewports; single pages otherwise. */
export function viewMode(viewport: Size): ViewMode {
  const wideEnough = viewport.width >= SPREAD_BREAKPOINT_PX
  const landscapeIsh = viewport.width >= viewport.height * SPREAD_MIN_VIEWPORT_ASPECT
  return wideEnough && landscapeIsh ? 'spread' : 'single'
}

/** Size in px of a page drawn `width` px wide, keeping the page aspect. */
export function pageSizeForWidth(book: Pick<Book, 'shape' | 'orientation'>, width: number): Size {
  return { width, height: Math.round(width / pageAspect(book)) }
}

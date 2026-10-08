import { DEFAULT_TRANSFORM } from './book'
import { EDITOR_SETTINGS, TRANSFORM_LIMITS } from './config'
import { clampTransform } from './layout'
import { expandToRenderPages } from './pages'
import { pageAspect } from './shape'
import type { Book, Page, PageTransform, Size } from './types'

type EditablePage = Pick<Page, 'kind' | 'fit' | 'transform' | 'margin'>

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Size of ONE page on the editor canvas so the page (or both pages of a spread) fits `box`. */
export function canvasPageSize(
  box: Size,
  book: Pick<Book, 'shape' | 'orientation'>,
  isSpread: boolean,
): Size {
  if (box.width <= 0 || box.height <= 0) return { width: 0, height: 0 }
  const aspect = pageAspect(book)
  const pagesAcross = isSpread ? 2 : 1
  const width = Math.floor(Math.min(box.width / pagesAcross, box.height * aspect))
  return { width, height: Math.floor(width / aspect) }
}

export interface MoveResult {
  transform: PageTransform
  /** Which axes snapped to the center (to show guides). */
  snapped: { x: boolean; y: boolean }
}

/**
 * Drag the image by `deltaPx` from where it was (`start`) on a canvas page of `pageSize`.
 * Offsets are normalized to the page (or the two-page area of a spread), snap to the center
 * when close, and are clamped so part of the image stays on the page.
 */
export function moveTransform(
  page: EditablePage,
  start: PageTransform,
  deltaPx: { x: number; y: number },
  pageSize: Size,
  imageSize: Size,
): MoveResult {
  const areaWidth = page.kind === 'spread' ? pageSize.width * 2 : pageSize.width
  if (areaWidth <= 0 || pageSize.height <= 0) {
    return { transform: start, snapped: { x: false, y: false } }
  }
  const snap = (value: number) => (Math.abs(value) < EDITOR_SETTINGS.snapShare ? 0 : value)
  const x = snap(start.x + deltaPx.x / areaWidth)
  const y = snap(start.y + deltaPx.y / pageSize.height)
  const transform = clampTransform({ ...page, transform: { ...start, x, y } }, pageSize, imageSize)
  return { transform, snapped: { x: transform.x === 0, y: transform.y === 0 } }
}

/** Set the zoom, keeping the transform within limits and the image partly on the page. */
export function zoomTransform(
  page: EditablePage,
  scale: number,
  pageSize: Size,
  imageSize: Size,
): PageTransform {
  return clampTransform({ ...page, transform: { ...page.transform, scale } }, pageSize, imageSize)
}

/** New zoom after a wheel/trackpad delta (negative deltaY zooms in). */
export function wheelZoomScale(scale: number, deltaY: number): number {
  const next = scale * Math.exp(-deltaY * EDITOR_SETTINGS.wheelZoomPerPx)
  return clamp(next, TRANSFORM_LIMITS.minScale, TRANSFORM_LIMITS.maxScale)
}

const LOG_MIN = Math.log(TRANSFORM_LIMITS.minScale)
const LOG_RANGE = Math.log(TRANSFORM_LIMITS.maxScale) - LOG_MIN

/** Zoom slider position (0–1, logarithmic so 1× sits sensibly) for a scale, and back. */
export function scaleToSlider(scale: number): number {
  return clamp((Math.log(scale) - LOG_MIN) / LOG_RANGE, 0, 1)
}

export function sliderToScale(value: number): number {
  return Math.exp(LOG_MIN + clamp(value, 0, 1) * LOG_RANGE)
}

/** Rotation after a quarter turn (−1 = counter-clockwise), snapped to a multiple of 90°. */
export function quarterTurn(rotation: number, direction: 1 | -1): number {
  const turned = (Math.round(rotation / 90) + direction) * 90
  const normalized = (((turned % 360) + 540) % 360) - 180
  return normalized === 0 ? 0 : normalized
}

/** A page back to its defaults: contain, centered, unscaled, no rotation, paper, no margin. */
export function resetPage<T extends Page>(page: T): T {
  return {
    ...page,
    fit: 'contain',
    transform: { ...DEFAULT_TRANSFORM },
    background: null,
    margin: 0,
  }
}

/** Image page ↔ spread page. Blank pages stay blank. */
export function toggleSpread<T extends Page>(page: T): T {
  if (page.kind === 'blank') return page
  return { ...page, kind: page.kind === 'spread' ? 'image' : 'spread' }
}

/** Every image id the book still refers to (pages and cover). */
export function imageIdsInUse(book: Pick<Book, 'pages' | 'cover'>): Set<string> {
  const ids = new Set(book.pages.flatMap((page) => (page.imageId ? [page.imageId] : [])))
  if (book.cover.imageId) ids.add(book.cover.imageId)
  return ids
}

/** Ids of spread pages that get a blank page before them (in two-page view) to start on the left. */
export function spreadsAfterFiller(book: Pick<Book, 'pages'>): Set<string> {
  const ids = new Set<string>()
  for (const page of expandToRenderPages(book, 'spread').pages) {
    if (page.kind === 'filler' && page.beforePageId) ids.add(page.beforePageId)
  }
  return ids
}

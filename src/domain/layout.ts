import { DEFAULT_TRANSFORM } from './book'
import { TRANSFORM_LIMITS } from './config'
import type { Fit, ImagePlacement, Page, PageTransform, Rect, Size, SpreadPlacement } from './types'

type PlacedPage = Pick<Page, 'fit' | 'transform' | 'margin'>

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const noNegativeZero = (value: number) => (value === 0 ? 0 : value)

/** Degrees in [-180, 180). */
function normalizeDegrees(degrees: number): number {
  return (((degrees % 360) + 540) % 360) - 180
}

function isQuarterTurned(rotation: number): boolean {
  return Math.abs(Math.round(rotation / 90)) % 2 === 1
}

function marginPx(pageSize: Size, margin: number): number {
  return margin * Math.min(pageSize.width, pageSize.height)
}

function contentFrame(area: Size, margin: number): Rect {
  return {
    left: margin,
    top: margin,
    width: Math.max(0, area.width - 2 * margin),
    height: Math.max(0, area.height - 2 * margin),
  }
}

/** Unrotated element size for a fit mode; quarter-turned images fit the swapped box. */
function fitSize(box: Size, image: Size, fit: Fit, rotation: number): Size {
  const target = isQuarterTurned(rotation) ? { width: box.height, height: box.width } : box
  if (fit === 'stretch') return target
  if (image.width <= 0 || image.height <= 0) return { width: 0, height: 0 }
  const scaleX = target.width / image.width
  const scaleY = target.height / image.height
  const scale = fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
  return { width: image.width * scale, height: image.height * scale }
}

/** Place an image inside an area (one page, or both pages of a spread). */
function placeInArea(area: Size, margin: number, image: Size, page: PlacedPage): ImagePlacement {
  const { x, y, scale, rotation } = page.transform
  const frame = contentFrame(area, margin)
  const base = fitSize(frame, image, page.fit, rotation)
  const width = base.width * scale
  const height = base.height * scale
  const centerX = area.width / 2 + x * area.width
  const centerY = area.height / 2 + y * area.height
  return { left: centerX - width / 2, top: centerY - height / 2, width, height, rotation, frame }
}

/** Placement of a page's image, in px, from its normalized fit, transform and margin. */
export function computeImagePlacement(
  pageSize: Size,
  imageSize: Size,
  page: PlacedPage,
): ImagePlacement {
  return placeInArea(pageSize, marginPx(pageSize, page.margin), imageSize, page)
}

/**
 * Placement of an image spanning both pages of a spread. The image is laid out across the
 * two-page area (transform `x` is a fraction of the spread width), then split at the gutter:
 * each half is in its own page's coordinates, and the frames meet at the gutter with no margin.
 */
export function computeSpreadPlacement(
  pageSize: Size,
  imageSize: Size,
  page: PlacedPage,
): SpreadPlacement {
  const margin = marginPx(pageSize, page.margin)
  const area = { width: pageSize.width * 2, height: pageSize.height }
  const full = placeInArea(area, margin, imageSize, page)
  const halfFrame = {
    top: full.frame.top,
    width: Math.max(0, pageSize.width - margin),
    height: full.frame.height,
  }
  return {
    left: { ...full, frame: { ...halfFrame, left: margin } },
    right: { ...full, left: full.left - pageSize.width, frame: { ...halfFrame, left: 0 } },
  }
}

/** Center range that keeps `visible` px of an extent-wide image overlapping the frame span. */
function centerRange(frameStart: number, frameSize: number, extent: number) {
  const visible = Math.min(TRANSFORM_LIMITS.minVisibleFraction * frameSize, extent)
  return {
    min: frameStart + visible - extent / 2,
    max: frameStart + frameSize - visible + extent / 2,
  }
}

/**
 * Keep a transform sensible: scale within limits, rotation in [-180, 180), and the image
 * (its rotated bounding box) still overlapping part of the page's content box.
 */
export function clampTransform(
  page: PlacedPage & Pick<Page, 'kind'>,
  pageSize: Size,
  imageSize: Size,
): PageTransform {
  const scale = clamp(page.transform.scale, TRANSFORM_LIMITS.minScale, TRANSFORM_LIMITS.maxScale)
  const rotation = normalizeDegrees(page.transform.rotation)
  const transform = { ...page.transform, scale, rotation }
  const area =
    page.kind === 'spread' ? { width: pageSize.width * 2, height: pageSize.height } : pageSize
  if (area.width <= 0 || area.height <= 0) return transform

  const placed = placeInArea(area, marginPx(pageSize, page.margin), imageSize, {
    ...page,
    transform,
  })
  const radians = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const boundsWidth = placed.width * cos + placed.height * sin
  const boundsHeight = placed.width * sin + placed.height * cos
  const rangeX = centerRange(placed.frame.left, placed.frame.width, boundsWidth)
  const rangeY = centerRange(placed.frame.top, placed.frame.height, boundsHeight)
  const centerX = clamp(placed.left + placed.width / 2, rangeX.min, rangeX.max)
  const centerY = clamp(placed.top + placed.height / 2, rangeY.min, rangeY.max)
  return {
    x: noNegativeZero((centerX - area.width / 2) / area.width),
    y: noNegativeZero((centerY - area.height / 2) / area.height),
    scale,
    rotation: noNegativeZero(rotation),
  }
}

/** The centered, unscaled, unrotated transform. */
export function resetTransform(): PageTransform {
  return { ...DEFAULT_TRANSFORM }
}

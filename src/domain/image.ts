import { IMAGE_LIMITS } from './config'
import type { Size } from './types'

/** Scale `size` down so its longer side is at most `maxPx`. Never upscales; whole pixels, ≥ 1. */
export function fitWithin(size: Size, maxPx: number): Size {
  const longest = Math.max(size.width, size.height)
  const scale = longest > maxPx ? maxPx / longest : 1
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  }
}

/** Target sizes for the stored display image and its thumbnail. */
export function resizePlan(original: Size): { display: Size; thumb: Size } {
  return {
    display: fitWithin(original, IMAGE_LIMITS.displayMaxPx),
    thumb: fitWithin(original, IMAGE_LIMITS.thumbMaxPx),
  }
}

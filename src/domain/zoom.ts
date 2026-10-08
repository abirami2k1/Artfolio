import { ZOOM_SETTINGS } from './config'
import type { Size } from './types'

export interface Pan {
  x: number
  y: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const noNegativeZero = (value: number) => (value === 0 ? 0 : value)

/** Zoom between 1 (fits the screen) and ZOOM_SETTINGS.maxScale. */
export function clampZoomScale(scale: number): number {
  return clamp(scale, 1, ZOOM_SETTINGS.maxScale)
}

/**
 * Keep zoomed content (centered, `content` px at scale 1) covering the viewport: on an axis
 * where it's smaller than the viewport it stays centered, otherwise its edges can't come in
 * past the viewport's.
 */
export function clampZoomPan(pan: Pan, scale: number, content: Size, viewport: Size): Pan {
  const axis = (offset: number, contentPx: number, viewportPx: number) => {
    const slack = Math.max(0, (contentPx * scale - viewportPx) / 2)
    return noNegativeZero(clamp(offset, -slack, slack))
  }
  return {
    x: axis(pan.x, content.width, viewport.width),
    y: axis(pan.y, content.height, viewport.height),
  }
}

/** A pinch that ends below ZOOM_SETTINGS.closeBelowScale closes the zoom view. */
export function pinchClosesZoom(scale: number): boolean {
  return scale < ZOOM_SETTINGS.closeBelowScale
}

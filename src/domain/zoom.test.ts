import { describe, expect, it } from 'vitest'
import { ZOOM_SETTINGS } from './config'
import { clampZoomPan, clampZoomScale, pinchClosesZoom } from './zoom'

const VIEWPORT = { width: 1000, height: 800 }
const CONTENT = { width: 900, height: 600 }

describe('zoom', () => {
  it('clamps scale between 1 and maxScale', () => {
    expect(clampZoomScale(0.5)).toBe(1)
    expect(clampZoomScale(2)).toBe(2)
    expect(clampZoomScale(99)).toBe(ZOOM_SETTINGS.maxScale)
  })

  it('keeps content centered on an axis where it fits', () => {
    expect(clampZoomPan({ x: 300, y: -200 }, 1, CONTENT, VIEWPORT)).toEqual({ x: 0, y: 0 })
  })

  it('lets zoomed content pan only until its edge reaches the viewport edge', () => {
    // at 2×: 1800×1200 → slack 400 horizontally, 200 vertically
    expect(clampZoomPan({ x: 1000, y: -1000 }, 2, CONTENT, VIEWPORT)).toEqual({ x: 400, y: -200 })
    expect(clampZoomPan({ x: 120, y: 50 }, 2, CONTENT, VIEWPORT)).toEqual({ x: 120, y: 50 })
  })

  it('a pinch-out below the threshold closes', () => {
    expect(pinchClosesZoom(ZOOM_SETTINGS.closeBelowScale - 0.01)).toBe(true)
    expect(pinchClosesZoom(1)).toBe(false)
  })
})

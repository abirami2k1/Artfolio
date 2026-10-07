import { describe, expect, it } from 'vitest'
import { createPage, DEFAULT_TRANSFORM } from './book'
import { TRANSFORM_LIMITS } from './config'
import {
  clampTransform,
  computeImagePlacement,
  computeSpreadPlacement,
  resetTransform,
} from './layout'
import type { ImagePlacement, Page, PageTransform, Size } from './types'

const PORTRAIT_PAGE: Size = { width: 600, height: 800 }
const WIDE_PAGE: Size = { width: 800, height: 600 }
const WIDE_IMAGE: Size = { width: 2000, height: 1000 }
const TALL_IMAGE: Size = { width: 1000, height: 2000 }

function page(overrides: Partial<Page> = {}, transform: Partial<PageTransform> = {}): Page {
  const base = createPage('img', { id: 'p' })
  return { ...base, ...overrides, transform: { ...base.transform, ...transform } }
}

/** Image box only, rounded, to compare without float noise. */
function box(p: ImagePlacement) {
  const r = (n: number) => Math.round(n * 1000) / 1000
  return { left: r(p.left), top: r(p.top), width: r(p.width), height: r(p.height) }
}

describe('computeImagePlacement — fit modes', () => {
  it('contain: wide image on a portrait page fits the width, centered vertically', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({ fit: 'contain' }))
    expect(box(p)).toEqual({ left: 0, top: 250, width: 600, height: 300 })
    expect(p.frame).toEqual({ left: 0, top: 0, width: 600, height: 800 })
  })

  it('contain: tall image on a wide page fits the height, centered horizontally', () => {
    const p = computeImagePlacement(WIDE_PAGE, TALL_IMAGE, page({ fit: 'contain' }))
    expect(box(p)).toEqual({ left: 250, top: 0, width: 300, height: 600 })
  })

  it('cover: wide image on a portrait page fills the height and overflows the sides', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({ fit: 'cover' }))
    expect(box(p)).toEqual({ left: -500, top: 0, width: 1600, height: 800 })
  })

  it('cover: tall image on a wide page fills the width and overflows top/bottom', () => {
    const p = computeImagePlacement(WIDE_PAGE, TALL_IMAGE, page({ fit: 'cover' }))
    expect(box(p)).toEqual({ left: 0, top: -500, width: 800, height: 1600 })
  })

  it('stretch: fills the page regardless of image ratio', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({ fit: 'stretch' }))
    expect(box(p)).toEqual({ left: 0, top: 0, width: 600, height: 800 })
  })

  it('margin insets the content frame by a fraction of the shorter side', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({ margin: 0.1 }))
    expect(p.frame).toEqual({ left: 60, top: 60, width: 480, height: 680 })
    expect(box(p)).toEqual({ left: 60, top: 280, width: 480, height: 240 })
  })

  it('margin applies to cover and stretch too', () => {
    const stretch = computeImagePlacement(
      PORTRAIT_PAGE,
      WIDE_IMAGE,
      page({ fit: 'stretch', margin: 0.1 }),
    )
    expect(box(stretch)).toEqual({ left: 60, top: 60, width: 480, height: 680 })
    const cover = computeImagePlacement(
      PORTRAIT_PAGE,
      WIDE_IMAGE,
      page({ fit: 'cover', margin: 0.1 }),
    )
    expect(cover.height).toBeCloseTo(680)
  })

  it('a quarter-turned image fits using its rotated bounds', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({}, { rotation: 90 }))
    // element 800×400, turned it occupies 400×800 — exactly the page height
    expect(box(p)).toEqual({ left: -100, top: 200, width: 800, height: 400 })
    expect(p.rotation).toBe(90)
  })

  it('handles a zero-size image without NaN', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, { width: 0, height: 0 }, page())
    expect(Object.values(box(p)).every(Number.isFinite)).toBe(true)
  })
})

describe('computeImagePlacement — normalized transform', () => {
  it('x/y move the image center by a fraction of the page size', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({}, { x: 0.25, y: -0.1 }))
    expect(box(p)).toEqual({ left: 150, top: 170, width: 600, height: 300 })
  })

  it('scale grows the image around its center', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({}, { scale: 2 }))
    expect(box(p)).toEqual({ left: -300, top: 100, width: 1200, height: 600 })
  })

  it('passes free rotation through without changing the fit box', () => {
    const p = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, page({}, { rotation: 15 }))
    expect(p.rotation).toBe(15)
    expect(box(p)).toEqual({ left: 0, top: 250, width: 600, height: 300 })
  })

  it.each(['contain', 'cover', 'stretch'] as const)(
    '%s: the same transform gives a proportional result at two page sizes',
    (fit) => {
      const p = page({ fit, margin: 0.05 }, { x: 0.12, y: -0.2, scale: 1.7, rotation: 30 })
      const big = computeImagePlacement({ width: 1200, height: 1600 }, WIDE_IMAGE, p)
      const small = computeImagePlacement({ width: 300, height: 400 }, WIDE_IMAGE, p)
      for (const key of ['left', 'top', 'width', 'height'] as const) {
        expect(big[key]).toBeCloseTo(small[key] * 4, 6)
        expect(big.frame[key]).toBeCloseTo(small.frame[key] * 4, 6)
      }
      expect(big.rotation).toBe(small.rotation)
    },
  )
})

describe('computeSpreadPlacement', () => {
  const SPREAD_PAGE: Size = { width: 500, height: 700 }

  it('lays the image across both pages and splits it at the gutter', () => {
    const { left, right } = computeSpreadPlacement(
      SPREAD_PAGE,
      WIDE_IMAGE,
      page({ kind: 'spread' }),
    )
    expect(box(left)).toEqual({ left: 0, top: 100, width: 1000, height: 500 })
    expect(box(right)).toEqual({ left: -500, top: 100, width: 1000, height: 500 })
  })

  it.each([
    ['centered', {}, 0],
    ['offset and zoomed', { x: 0.1, y: 0.05, scale: 1.4 }, 0],
    ['with a margin', { x: -0.07, scale: 0.9 }, 0.08],
    ['rotated', { rotation: 12, scale: 1.2 }, 0.04],
  ] as const)('halves line up exactly at the gutter (%s)', (_label, transform, margin) => {
    const { left, right } = computeSpreadPlacement(
      SPREAD_PAGE,
      WIDE_IMAGE,
      page({ kind: 'spread', margin }, transform),
    )
    // the right half is the same image shifted one page width to the left
    expect(right.left + SPREAD_PAGE.width).toBeCloseTo(left.left, 10)
    expect(right.top).toBe(left.top)
    expect(right.width).toBe(left.width)
    expect(right.height).toBe(left.height)
    expect(right.rotation).toBe(left.rotation)
    // frames meet at the gutter: left frame ends at the page edge, right frame starts at 0
    expect(left.frame.left + left.frame.width).toBeCloseTo(SPREAD_PAGE.width, 10)
    expect(right.frame.left).toBe(0)
    expect(right.frame.top).toBe(left.frame.top)
  })

  it('keeps outer margins on both halves', () => {
    const { left, right } = computeSpreadPlacement(SPREAD_PAGE, WIDE_IMAGE, page({ margin: 0.1 }))
    expect(left.frame).toEqual({ left: 50, top: 50, width: 450, height: 600 })
    expect(right.frame).toEqual({ left: 0, top: 50, width: 450, height: 600 })
  })
})

describe('clampTransform', () => {
  const frameOverlap = (p: ImagePlacement) => ({
    x: Math.min(p.left + p.width, p.frame.left + p.frame.width) - Math.max(p.left, p.frame.left),
    y: Math.min(p.top + p.height, p.frame.top + p.frame.height) - Math.max(p.top, p.frame.top),
  })

  it('leaves a reasonable transform unchanged', () => {
    const t = { x: 0.1, y: -0.05, scale: 1.3, rotation: 20 }
    expect(clampTransform(page({}, t), PORTRAIT_PAGE, WIDE_IMAGE)).toEqual(t)
  })

  it('clamps scale to the configured limits', () => {
    expect(clampTransform(page({}, { scale: 1000 }), PORTRAIT_PAGE, WIDE_IMAGE).scale).toBe(
      TRANSFORM_LIMITS.maxScale,
    )
    expect(clampTransform(page({}, { scale: 0.0001 }), PORTRAIT_PAGE, WIDE_IMAGE).scale).toBe(
      TRANSFORM_LIMITS.minScale,
    )
  })

  it.each([
    [450, 90],
    [-90, -90],
    [180, -180],
    [-270, 90],
    [720, 0],
  ])('normalizes rotation %i° to %i°', (input, expected) => {
    expect(clampTransform(page({}, { rotation: input }), PORTRAIT_PAGE, WIDE_IMAGE).rotation).toBe(
      expected,
    )
  })

  it.each([
    ['far right', { x: 5 }, 0],
    ['far left', { x: -5 }, 0],
    ['far down', { y: 3 }, 0],
    ['far up-left, small', { x: -2, y: -2, scale: 0.2 }, 0],
    ['far right, margin', { x: 4 }, 0.1],
  ] as [string, Partial<PageTransform>, number][])(
    'pulls an image dragged %s back to keep part of it on the page',
    (_l, t, margin) => {
      const p = page({ margin }, t)
      const clamped = clampTransform(p, PORTRAIT_PAGE, WIDE_IMAGE)
      const placed = computeImagePlacement(PORTRAIT_PAGE, WIDE_IMAGE, { ...p, transform: clamped })
      const overlap = frameOverlap(placed)
      expect(overlap.x).toBeGreaterThan(0)
      expect(overlap.y).toBeGreaterThan(0)
      expect(overlap.x).toBeGreaterThanOrEqual(
        Math.min(TRANSFORM_LIMITS.minVisibleFraction * placed.frame.width, placed.width) - 1e-9,
      )
    },
  )

  it('is resolution independent', () => {
    const p = page({}, { x: 9, y: -9 })
    const a = clampTransform(p, PORTRAIT_PAGE, WIDE_IMAGE)
    const b = clampTransform(p, { width: 1500, height: 2000 }, WIDE_IMAGE)
    expect(a.x).toBeCloseTo(b.x, 10)
    expect(a.y).toBeCloseTo(b.y, 10)
  })

  it('uses the two-page area for spread pages', () => {
    // tall image, contain → 400×800 on one page. Single page: center may reach 600 − 60 + 200.
    const single = clampTransform(page({}, { x: 5 }), PORTRAIT_PAGE, TALL_IMAGE)
    expect(single.x).toBeCloseTo((740 - 300) / 600, 10)
    // Spread area is 1200 wide: center may reach 1200 − 120 + 200.
    const spread = clampTransform(page({ kind: 'spread' }, { x: 5 }), PORTRAIT_PAGE, TALL_IMAGE)
    expect(spread.x).toBeCloseTo((1280 - 600) / 1200, 10)
  })

  it('only clamps scale and rotation for an empty page size', () => {
    const t = clampTransform(page({}, { x: 7, scale: 99 }), { width: 0, height: 0 }, WIDE_IMAGE)
    expect(t).toEqual({ x: 7, y: 0, scale: TRANSFORM_LIMITS.maxScale, rotation: 0 })
  })
})

describe('resetTransform', () => {
  it('returns a fresh default transform', () => {
    const t = resetTransform()
    expect(t).toEqual({ x: 0, y: 0, scale: 1, rotation: 0 })
    expect(t).not.toBe(DEFAULT_TRANSFORM)
  })
})

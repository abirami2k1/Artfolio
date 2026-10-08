import { describe, expect, it } from 'vitest'
import { createBook, createPage, DEFAULT_TRANSFORM } from './book'
import { EDITOR_SETTINGS, TRANSFORM_LIMITS } from './config'
import {
  canvasPageSize,
  imageIdsInUse,
  moveTransform,
  quarterTurn,
  resetPage,
  scaleToSlider,
  sliderToScale,
  spreadsAfterFiller,
  toggleSpread,
  wheelZoomScale,
  zoomTransform,
} from './editor'
import type { Page } from './types'

const PAGE = { width: 400, height: 500 }
const IMAGE = { width: 1000, height: 800 }
const image = (id: string, overrides: Partial<Page> = {}): Page => ({
  ...createPage(`img-${id}`, { id }),
  ...overrides,
})

describe('canvasPageSize', () => {
  const book = createBook({ presetId: 'square' })
  it('fits one page, or both pages of a spread, inside the box', () => {
    expect(canvasPageSize({ width: 800, height: 500 }, book, false)).toEqual({
      width: 500,
      height: 500,
    })
    expect(canvasPageSize({ width: 800, height: 500 }, book, true)).toEqual({
      width: 400,
      height: 400,
    })
    expect(canvasPageSize({ width: 0, height: 500 }, book, false)).toEqual({ width: 0, height: 0 })
  })

  it('keeps the page aspect', () => {
    const tall = createBook({ presetId: 'a-series' })
    const size = canvasPageSize({ width: 1000, height: 707 }, tall, false)
    expect(size.height).toBeLessThanOrEqual(707)
    expect(size.width / size.height).toBeCloseTo(1 / 1.414, 2)
  })
})

describe('moveTransform', () => {
  it('normalizes the drag to the page size', () => {
    const { transform } = moveTransform(
      image('a'),
      DEFAULT_TRANSFORM,
      { x: 40, y: -100 },
      PAGE,
      IMAGE,
    )
    expect(transform.x).toBeCloseTo(0.1)
    expect(transform.y).toBeCloseTo(-0.2)
  })

  it('a spread page normalizes x to the two-page width', () => {
    const spread = image('s', { kind: 'spread' })
    const { transform } = moveTransform(spread, DEFAULT_TRANSFORM, { x: 80, y: 0 }, PAGE, IMAGE)
    expect(transform.x).toBeCloseTo(0.1)
  })

  it('snaps to the center when close, and says so', () => {
    const start = { ...DEFAULT_TRANSFORM, x: 0.1, y: 0.1 }
    const nearlyBack = -(0.1 - EDITOR_SETTINGS.snapShare / 2)
    const result = moveTransform(
      image('a'),
      start,
      { x: nearlyBack * PAGE.width, y: 10 },
      PAGE,
      IMAGE,
    )
    expect(result.transform.x).toBe(0)
    expect(result.snapped).toEqual({ x: true, y: false })
  })

  it('keeps part of the image on the page', () => {
    const { transform } = moveTransform(
      image('a'),
      DEFAULT_TRANSFORM,
      { x: 99999, y: 0 },
      PAGE,
      IMAGE,
    )
    expect(transform.x).toBeGreaterThan(0)
    expect(transform.x).toBeLessThan(1.5)
  })
})

describe('zoom', () => {
  it('zoomTransform clamps the scale', () => {
    expect(zoomTransform(image('a'), 100, PAGE, IMAGE).scale).toBe(TRANSFORM_LIMITS.maxScale)
    expect(zoomTransform(image('a'), 2, PAGE, IMAGE).scale).toBe(2)
  })

  it('wheel up zooms in, down zooms out, within limits', () => {
    expect(wheelZoomScale(1, -100)).toBeGreaterThan(1)
    expect(wheelZoomScale(1, 100)).toBeLessThan(1)
    expect(wheelZoomScale(TRANSFORM_LIMITS.maxScale, -1000)).toBe(TRANSFORM_LIMITS.maxScale)
  })

  it('the slider maps both ways on a log scale', () => {
    expect(sliderToScale(0)).toBeCloseTo(TRANSFORM_LIMITS.minScale)
    expect(sliderToScale(1)).toBeCloseTo(TRANSFORM_LIMITS.maxScale)
    for (const scale of [0.25, 1, 3]) expect(sliderToScale(scaleToSlider(scale))).toBeCloseTo(scale)
  })
})

describe('quarterTurn', () => {
  it('turns by 90° from the nearest quarter, staying in [-180, 180)', () => {
    expect(quarterTurn(0, 1)).toBe(90)
    expect(quarterTurn(0, -1)).toBe(-90)
    expect(quarterTurn(90, 1)).toBe(-180)
    expect(quarterTurn(-180, -1)).toBe(90)
    expect(quarterTurn(12, 1)).toBe(90)
    expect(quarterTurn(-90, 1)).toBe(0)
  })
})

describe('page helpers', () => {
  it('resetPage restores the defaults but keeps the image', () => {
    const edited = image('a', {
      fit: 'cover',
      transform: { x: 0.2, y: 0, scale: 2, rotation: 30 },
      background: '#000000',
      margin: 0.1,
    })
    expect(resetPage(edited)).toEqual(createPage('img-a', { id: 'a' }))
  })

  it('toggleSpread switches image ↔ spread; blank pages stay blank', () => {
    expect(toggleSpread(image('a')).kind).toBe('spread')
    expect(toggleSpread(toggleSpread(image('a'))).kind).toBe('image')
    expect(toggleSpread(createPage()).kind).toBe('blank')
  })

  it('imageIdsInUse covers pages and the cover image', () => {
    const book = {
      ...createBook(),
      pages: [image('a'), image('b', { kind: 'spread' }), createPage()],
    }
    book.cover = { ...book.cover, imageId: 'cover-img' }
    expect(imageIdsInUse(book)).toEqual(new Set(['img-a', 'img-b', 'cover-img']))
  })

  it('spreadsAfterFiller names spreads that need a blank page before them', () => {
    const pages = [image('a'), image('s', { kind: 'spread' }), image('t', { kind: 'spread' })]
    expect(spreadsAfterFiller({ pages })).toEqual(new Set(['s']))
    expect(spreadsAfterFiller({ pages: [image('s', { kind: 'spread' })] })).toEqual(new Set())
  })
})

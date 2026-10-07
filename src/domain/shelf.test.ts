import { describe, expect, it } from 'vitest'
import { createBook } from './book'
import { BOOK_THICKNESS, SHELF_SETTINGS } from './config'
import { pageAspect } from './shape'
import {
  bookThickness,
  carouselLayout,
  coverBox,
  coverGeometry,
  dragPosition,
  settleCarouselIndex,
} from './shelf'

const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

describe('coverBox', () => {
  it('takes a share of the viewport, capped in width', () => {
    expect(coverBox(PHONE)).toEqual({
      width: PHONE.width * SHELF_SETTINGS.coverBox.widthShare,
      height: PHONE.height * SHELF_SETTINGS.coverBox.heightShare,
    })
    expect(coverBox({ width: 5000, height: 900 }).width).toBe(SHELF_SETTINGS.coverBox.maxWidthPx)
  })
})

describe('bookThickness', () => {
  it('grows with page count between the limits', () => {
    expect(bookThickness(0)).toBe(BOOK_THICKNESS.minShare)
    expect(bookThickness(20)).toBeGreaterThan(bookThickness(0))
    expect(bookThickness(40)).toBeGreaterThan(bookThickness(20))
    expect(bookThickness(100_000)).toBe(BOOK_THICKNESS.maxShare)
    expect(bookThickness(-5)).toBe(BOOK_THICKNESS.minShare)
  })
})

describe('coverGeometry', () => {
  const box = { width: 400, height: 400 }

  it.each([
    ['portrait', createBook({ presetId: 'a-series' })],
    ['square', createBook({ presetId: 'square' })],
    ['landscape', createBook({ presetId: 'picture' })],
  ])('%s cover keeps its true proportions and fits the box', (_label, book) => {
    const g = coverGeometry(book, 50, box)
    expect(g.width / g.height).toBeCloseTo(pageAspect(book), 10)
    expect(g.width + g.thickness).toBeLessThanOrEqual(box.width + 1e-9)
    expect(g.height).toBeLessThanOrEqual(box.height + 1e-9)
  })

  it('tall books look tall and wide books look wide', () => {
    const tall = coverGeometry(createBook({ presetId: 'a-series' }), 0, box)
    const wide = coverGeometry(createBook({ presetId: 'picture' }), 0, box)
    expect(tall.height).toBeGreaterThan(tall.width)
    expect(wide.width).toBeGreaterThan(wide.height)
  })

  it('thicker with more pages', () => {
    const book = createBook({ presetId: 'square' })
    expect(coverGeometry(book, 80, box).thickness).toBeGreaterThan(
      coverGeometry(book, 2, box).thickness,
    )
  })
})

describe('carouselLayout', () => {
  it('centers the selected cover at full size, in front', () => {
    expect(carouselLayout(3, 3, DESKTOP)).toEqual({
      x: 0,
      scale: 1,
      zIndex: 1000,
      opacity: 1,
      visible: true,
    })
  })

  it('neighbors peek out on either side, smaller and behind', () => {
    const step = SHELF_SETTINGS.neighborOffset * coverBox(DESKTOP).width
    const left = carouselLayout(2, 3, DESKTOP)
    const right = carouselLayout(4, 3, DESKTOP)
    expect(left.x).toBeCloseTo(-step)
    expect(right.x).toBeCloseTo(step)
    for (const n of [left, right]) {
      expect(n.scale).toBe(SHELF_SETTINGS.neighborScale)
      expect(n.zIndex).toBeLessThan(1000)
      expect(n.opacity).toBeCloseTo(SHELF_SETTINGS.neighborOpacity)
      expect(n.visible).toBe(true)
    }
  })

  it('further covers sit further back, fade, and hide past the visible range', () => {
    const near = carouselLayout(4, 3, DESKTOP)
    const far = carouselLayout(5, 3, DESKTOP)
    expect(far.zIndex).toBeLessThan(near.zIndex)
    expect(far.opacity).toBeLessThan(near.opacity)
    expect(carouselLayout(3 + SHELF_SETTINGS.visibleNeighbors + 1, 3, DESKTOP).visible).toBe(false)
  })

  it('interpolates smoothly while dragging', () => {
    const halfway = carouselLayout(4, 3.5, DESKTOP)
    expect(halfway.scale).toBeCloseTo(1 - (1 - SHELF_SETTINGS.neighborScale) / 2)
    expect(halfway.x).toBeCloseTo(carouselLayout(4, 3, DESKTOP).x / 2)
  })
})

describe('dragPosition and settleCarouselIndex', () => {
  const step = SHELF_SETTINGS.neighborOffset * coverBox(DESKTOP).width

  it('dragging left by one step moves to the next book', () => {
    expect(dragPosition(2, -step, DESKTOP, 10)).toBeCloseTo(3)
    expect(dragPosition(2, step / 2, DESKTOP, 10)).toBeCloseTo(1.5)
  })

  it('stretches only a little past either end', () => {
    expect(dragPosition(0, step * 5, DESKTOP, 10)).toBe(-SHELF_SETTINGS.overscroll)
    expect(dragPosition(9, -step * 5, DESKTOP, 10)).toBe(9 + SHELF_SETTINGS.overscroll)
    expect(dragPosition(0, -step * 5, DESKTOP, 1)).toBe(SHELF_SETTINGS.overscroll)
  })

  it('settles on the nearest book', () => {
    expect(settleCarouselIndex(2, 2.4, 0, 10)).toBe(2)
    expect(settleCarouselIndex(2, 2.6, 0, 10)).toBe(3)
    expect(settleCarouselIndex(2, 0.6, 0, 10)).toBe(1)
  })

  it('a flick moves one book even below half a step', () => {
    const v = SHELF_SETTINGS.flickVelocity
    expect(settleCarouselIndex(2, 2.1, v, 10)).toBe(3)
    expect(settleCarouselIndex(2, 1.9, -v, 10)).toBe(1)
    expect(settleCarouselIndex(2, 2.1, v / 2, 10)).toBe(2)
  })

  it('stays within the shelf', () => {
    expect(settleCarouselIndex(0, -0.8, -5, 10)).toBe(0)
    expect(settleCarouselIndex(9, 9.9, 5, 10)).toBe(9)
    expect(settleCarouselIndex(0, 0, 0, 0)).toBe(0)
  })
})

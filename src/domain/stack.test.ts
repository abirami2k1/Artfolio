import { describe, expect, it } from 'vitest'
import { createPage } from './book'
import { READER_SETTINGS, STACK_SETTINGS } from './config'
import { expandToRenderPages } from './pages'
import {
  edgeTapStep,
  END_FILLER_KEY,
  groupIntoSpreads,
  insideSideOpacity,
  loadsFullImages,
  mountedSpreadRange,
  settleStackIndex,
  spreadAnchorKey,
  spreadBend,
  spreadCounterLabel,
  spreadIndexForPage,
  spreadPages,
  spreadSize,
  stackDragPosition,
  stackLayout,
} from './stack'
import type { Page, RenderPage, Spread } from './types'

const image = (id: string): Page => createPage(`img-${id}`, { id })
const spread = (id: string): Page => ({ ...image(id), kind: 'spread' })

function render(pages: Page[], mode: 'spread' | 'single') {
  return expandToRenderPages({ pages }, mode).pages
}

/** Spreads as [left, right] keys (or the single page's key). */
function keys(spreads: Spread[]) {
  const k = (page: RenderPage | null) => page?.key ?? null
  return spreads.map((s) => (s.kind === 'pair' ? [k(s.left), k(s.right)] : k(s.page)))
}

describe('groupIntoSpreads — spread mode', () => {
  it('an empty book is the front cover then the back cover', () => {
    expect(keys(groupIntoSpreads(render([], 'spread'), 'spread'))).toEqual([
      [null, 'front-cover'],
      ['back-cover', null],
    ])
  })

  it('pairs an even number of inside pages', () => {
    const pages = [image('a'), image('b'), image('c'), image('d')]
    expect(keys(groupIntoSpreads(render(pages, 'spread'), 'spread'))).toEqual([
      [null, 'front-cover'],
      ['a', 'b'],
      ['c', 'd'],
      ['back-cover', null],
    ])
  })

  it('gives an odd last page a blank partner', () => {
    const spreads = groupIntoSpreads(
      render([image('a'), image('b'), image('c')], 'spread'),
      'spread',
    )
    expect(keys(spreads)).toEqual([
      [null, 'front-cover'],
      ['a', 'b'],
      ['c', END_FILLER_KEY],
      ['back-cover', null],
    ])
  })

  it('keeps both halves of a spread page on one open spread (with filler when needed)', () => {
    const spreads = groupIntoSpreads(
      render([image('a'), spread('s'), image('b')], 'spread'),
      'spread',
    )
    expect(keys(spreads)).toEqual([
      [null, 'front-cover'],
      ['a', 'filler:s'],
      ['s:left', 's:right'],
      ['b', 'filler:end'],
      ['back-cover', null],
    ])
  })

  it('every spread has a unique key', () => {
    const spreads = groupIntoSpreads(
      render([image('a'), image('b'), image('c')], 'spread'),
      'spread',
    )
    expect(new Set(spreads.map((s) => s.key)).size).toBe(spreads.length)
  })
})

describe('groupIntoSpreads — single mode', () => {
  it('shows every page, covers included, one at a time', () => {
    const spreads = groupIntoSpreads(render([image('a'), spread('s')], 'single'), 'single')
    expect(spreads.every((s) => s.kind === 'single')).toBe(true)
    expect(keys(spreads)).toEqual(['front-cover', 'a', 's:left', 's:right', 'back-cover'])
  })

  it('odd and even books map one page per spread', () => {
    expect(groupIntoSpreads(render([image('a')], 'single'), 'single')).toHaveLength(3)
    expect(groupIntoSpreads(render([image('a'), image('b')], 'single'), 'single')).toHaveLength(4)
  })
})

describe('stackLayout', () => {
  const W = 1000
  const { visibleLayers, layerOffsetPx, layerScaleStep } = STACK_SETTINGS

  it('the current spread is centered, full size and on top', () => {
    const current = stackLayout(5, 5, 0, W)
    expect(current).toEqual({ x: 0, scale: 1, zIndex: 1000, opacity: 1, visible: true })
    for (const other of [3, 4, 6, 7]) {
      expect(stackLayout(other, 5, 0, W).zIndex).toBeLessThan(current.zIndex)
    }
  })

  it('later spreads peek out on the right, earlier ones on the left, each layer smaller', () => {
    const next = stackLayout(6, 5, 0, W)
    const prev = stackLayout(4, 5, 0, W)
    const prev2 = stackLayout(3, 5, 0, W)
    // each layer's edge sits layerOffsetPx beyond the edge of the layer above it
    const edge = (layer: { x: number; scale: number }, side: 1 | -1) =>
      layer.x + (side * layer.scale * W) / 2
    expect(edge(next, 1) - W / 2).toBeCloseTo(layerOffsetPx)
    expect(edge(prev, -1) + W / 2).toBeCloseTo(-layerOffsetPx)
    expect(edge(prev2, -1) - edge(prev, -1)).toBeCloseTo(-layerOffsetPx)
    expect(next.scale).toBeCloseTo(1 - layerScaleStep)
    expect(prev2.scale).toBeCloseTo(1 - 2 * layerScaleStep)
    expect(prev.zIndex).toBeGreaterThan(prev2.zIndex)
  })

  it('draws only visibleLayers on each side', () => {
    expect(stackLayout(5 + visibleLayers, 5, 0, W).visible).toBe(true)
    expect(stackLayout(5 + visibleLayers + 1, 5, 0, W).visible).toBe(false)
    expect(stackLayout(5 - visibleLayers - 1, 5, 0, W)).toMatchObject({
      visible: false,
      opacity: 0,
    })
  })

  it('a full drag lands exactly where the next position is at rest', () => {
    for (const index of [3, 4, 5, 6, 7]) {
      expect(stackLayout(index, 5, 1, W)).toEqual(stackLayout(index, 6, 0, W))
      expect(stackLayout(index, 5, -1, W)).toEqual(stackLayout(index, 4, 0, W))
    }
  })

  it('mid-move, the spread heading to the earlier pile is lifted and slid out of the way', () => {
    const leaving = stackLayout(5, 5, 0.5, W)
    const arriving = stackLayout(6, 5, 0.5, W)
    expect(leaving.x).toBeLessThan(-W) // clear of the spread underneath
    expect(leaving.scale).toBeGreaterThan(1)
    expect(arriving.x).toBeGreaterThan(0)
    expect(arriving.x).toBeLessThan(stackLayout(6, 5, 0, W).x)
    expect(arriving.scale).toBeLessThan(1)
  })

  it('swaps which spread is on top halfway through a move', () => {
    const z = (drag: number) => [
      stackLayout(5, 5, drag, W).zIndex,
      stackLayout(6, 5, drag, W).zIndex,
    ]
    const [leavingEarly, arrivingEarly] = z(0.3)
    const [leavingLate, arrivingLate] = z(0.7)
    expect(leavingEarly).toBeGreaterThan(arrivingEarly)
    expect(leavingLate).toBeLessThan(arrivingLate)
  })

  it('moves continuously with the drag', () => {
    let previous = stackLayout(5, 5, 0, W).x
    for (let drag = 0.1; drag <= 1; drag += 0.1) {
      const x = stackLayout(5, 5, drag, W).x
      expect(Math.abs(x - previous)).toBeLessThan(W * 0.4)
      previous = x
    }
  })
})

describe('spreadBend', () => {
  const { restBowDeg, dragBowDeg, restShade, dragShade, trailingBendShare } = STACK_SETTINGS

  it('at rest both halves tilt toward the spine by restBowDeg', () => {
    expect(spreadBend(0)).toEqual({
      leftRotateY: restBowDeg,
      rightRotateY: -restBowDeg,
      shade: restShade,
    })
  })

  it('mid-move the lifted half bends the most and the crease darkens', () => {
    const sliding = spreadBend(-0.5) // sliding left, lifting the right half
    expect(sliding.rightRotateY).toBeCloseTo(-(restBowDeg + dragBowDeg))
    expect(sliding.leftRotateY).toBeCloseTo(restBowDeg + dragBowDeg * trailingBendShare)
    expect(sliding.shade).toBeCloseTo(restShade + dragShade)
    const back = spreadBend(0.5)
    expect(back.leftRotateY).toBeCloseTo(restBowDeg + dragBowDeg)
    expect(back.rightRotateY).toBeCloseTo(-(restBowDeg + dragBowDeg * trailingBendShare))
  })

  it('settles back to rest at the end of a move, and clamps beyond it', () => {
    for (const p of [1, -1, 3]) {
      const bend = spreadBend(p)
      expect(bend.leftRotateY).toBeCloseTo(restBowDeg)
      expect(bend.rightRotateY).toBeCloseTo(-restBowDeg)
      expect(bend.shade).toBeCloseTo(restShade)
    }
  })
})

describe('reader helpers', () => {
  const pages = [image('a'), image('b'), image('c')]
  const wide = groupIntoSpreads(render(pages, 'spread'), 'spread')
  const narrow = groupIntoSpreads(render(pages, 'single'), 'single')

  it('spreadSize: two pages wide in spread mode, one in single mode', () => {
    expect(spreadSize({ width: 300, height: 400 }, 'spread')).toEqual({ width: 600, height: 400 })
    expect(spreadSize({ width: 300, height: 400 }, 'single')).toEqual({ width: 300, height: 400 })
  })

  it('anchor keys keep the same page in view across a mode switch', () => {
    const index = 2 // [c, filler:end]
    const anchor = spreadAnchorKey(wide[index])
    expect(anchor).toBe('c')
    expect(spreadPages(narrow[spreadIndexForPage(narrow, anchor)])[0].key).toBe('c')
    const back = spreadAnchorKey(narrow[spreadIndexForPage(narrow, 'b')])
    expect(spreadIndexForPage(wide, back)).toBe(1)
    expect(spreadAnchorKey(wide[0])).toBe('front-cover')
    expect(spreadIndexForPage(wide, 'missing')).toBe(0)
    expect(spreadIndexForPage(wide, null)).toBe(0)
  })

  it('stackDragPosition: a spread width of drag moves one spread, never more, rubber-banding at ends', () => {
    expect(stackDragPosition(2, -500, 1000, 5)).toBe(2.5)
    expect(stackDragPosition(2, 500, 1000, 5)).toBe(1.5)
    expect(stackDragPosition(2, -5000, 1000, 5)).toBe(3)
    expect(stackDragPosition(0, 5000, 1000, 5)).toBe(-STACK_SETTINGS.overscroll)
    expect(stackDragPosition(4, -5000, 1000, 5)).toBe(4 + STACK_SETTINGS.overscroll)
    expect(stackDragPosition(2, -100, 0, 5)).toBe(2)
  })

  it('settleStackIndex: threshold or flick moves one spread; otherwise settles back', () => {
    const { swipeThreshold, flickVelocity } = STACK_SETTINGS
    expect(settleStackIndex(2, 2 + swipeThreshold, 0, 5)).toBe(3)
    expect(settleStackIndex(2, 2 - swipeThreshold, 0, 5)).toBe(1)
    expect(settleStackIndex(2, 2.1, 0, 5)).toBe(2)
    expect(settleStackIndex(2, 2.1, flickVelocity, 5)).toBe(3)
    expect(settleStackIndex(2, 2.1, -flickVelocity, 5)).toBe(2) // flick against the drag
    expect(settleStackIndex(4, 4.15, 0, 5)).toBe(4)
    expect(settleStackIndex(0, -0.15, -flickVelocity, 5)).toBe(0)
    expect(settleStackIndex(0, 0, 0, 0)).toBe(0)
  })

  it('mounts only the visible layers around the current spread', () => {
    const reach = STACK_SETTINGS.visibleLayers + 1
    expect(mountedSpreadRange(0, 100)).toEqual([0, reach])
    expect(mountedSpreadRange(50, 100)).toEqual([50 - reach, 50 + reach])
    expect(mountedSpreadRange(99, 100)).toEqual([99 - reach, 99])
  })

  it('loads full images only near the current spread', () => {
    const r = STACK_SETTINGS.displayRadius
    expect(loadsFullImages(10 + r, 10)).toBe(true)
    expect(loadsFullImages(10 - r, 10)).toBe(true)
    expect(loadsFullImages(10 + r + 1, 10)).toBe(false)
  })

  it('labels covers, single pages and page pairs', () => {
    expect(wide.map((_, i) => spreadCounterLabel(wide, i))).toEqual([
      'Cover',
      'Pages 1–2 of 3',
      'Page 3 of 3',
      'Back cover',
    ])
    expect(narrow.map((_, i) => spreadCounterLabel(narrow, i))).toEqual([
      'Cover',
      'Page 1 of 3',
      'Page 2 of 3',
      'Page 3 of 3',
      'Back cover',
    ])
    expect(spreadCounterLabel(wide, 9)).toBe('')
  })
})

describe('edgeTapStep', () => {
  const edge = READER_SETTINGS.edgeTapShare * 1000
  it('turns back near the left edge, forward near the right, nothing in the middle', () => {
    expect(edgeTapStep(edge - 1, 1000)).toBe(-1)
    expect(edgeTapStep(500, 1000)).toBe(0)
    expect(edgeTapStep(1000 - edge + 1, 1000)).toBe(1)
    expect(edgeTapStep(10, 0)).toBe(0)
  })
})

describe('insideSideOpacity', () => {
  it('hides the far side of inside spreads while a cover is on top, and reveals it as it moves', () => {
    expect(insideSideOpacity(0, 6, 'spread')).toEqual({ left: 0, right: 1 })
    expect(insideSideOpacity(0.4, 6, 'spread')).toEqual({ left: 0.4, right: 1 })
    expect(insideSideOpacity(2, 6, 'spread')).toEqual({ left: 1, right: 1 })
    expect(insideSideOpacity(5, 6, 'spread')).toEqual({ left: 1, right: 0 })
    expect(insideSideOpacity(0, 6, 'single')).toEqual({ left: 1, right: 1 })
  })
})

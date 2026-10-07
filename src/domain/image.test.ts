import { describe, expect, it } from 'vitest'
import { IMAGE_LIMITS } from './config'
import { fitWithin, resizePlan } from './image'

describe('fitWithin', () => {
  it.each([
    [{ width: 4000, height: 2000 }, 1000, { width: 1000, height: 500 }],
    [{ width: 2000, height: 4000 }, 1000, { width: 500, height: 1000 }],
    [{ width: 3000, height: 3000 }, 1000, { width: 1000, height: 1000 }],
    [{ width: 1001, height: 333 }, 1000, { width: 1000, height: 333 }],
    [{ width: 800, height: 600 }, 1000, { width: 800, height: 600 }], // never upscales
    [{ width: 1000, height: 10 }, 1000, { width: 1000, height: 10 }], // exactly at the limit
    [{ width: 10000, height: 1 }, 100, { width: 100, height: 1 }], // never below 1px
  ])('%o within %i → %o', (size, max, expected) => {
    expect(fitWithin(size, max)).toEqual(expected)
  })

  it('keeps the aspect ratio within rounding', () => {
    const out = fitWithin({ width: 3456, height: 2304 }, 777)
    expect(Math.abs(out.width / out.height - 3456 / 2304)).toBeLessThan(0.01)
  })
})

describe('resizePlan', () => {
  it('uses IMAGE_LIMITS for display and thumbnail', () => {
    const plan = resizePlan({ width: 10_000, height: 5_000 })
    expect(Math.max(plan.display.width, plan.display.height)).toBe(IMAGE_LIMITS.displayMaxPx)
    expect(Math.max(plan.thumb.width, plan.thumb.height)).toBe(IMAGE_LIMITS.thumbMaxPx)
  })

  it('keeps small images at their own size', () => {
    const plan = resizePlan({ width: 200, height: 100 })
    expect(plan.display).toEqual({ width: 200, height: 100 })
    expect(plan.thumb).toEqual({ width: 200, height: 100 })
  })
})

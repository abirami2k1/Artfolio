import { describe, expect, it } from 'vitest'
import { createBook } from './book'
import { BOOK_PRESETS, CUSTOM_PRESET_ID, DISPLAY_SIZES, SPREAD_BREAKPOINT_PX } from './config'
import { computeBookSize, pageAspect, viewMode } from './shape'
import type { Book, DisplaySize, Orientation, Size, ViewMode } from './types'

const orientations: Orientation[] = ['portrait', 'landscape']

describe('pageAspect', () => {
  const cases = BOOK_PRESETS.flatMap((preset) =>
    orientations.map((orientation) => [preset, orientation] as const),
  )

  it.each(cases)('%o in %s', (preset, orientation) => {
    const aspect = pageAspect(createBook({ presetId: preset.id, orientation }))
    const long = Math.max(preset.ratioW, preset.ratioH)
    const short = Math.min(preset.ratioW, preset.ratioH)
    expect(aspect).toBeCloseTo(orientation === 'portrait' ? short / long : long / short, 10)
    if (preset.ratioW !== preset.ratioH) {
      expect(orientation === 'portrait' ? aspect < 1 : aspect > 1).toBe(true)
    }
  })

  it('swaps a custom ratio for landscape', () => {
    const custom = { presetId: CUSTOM_PRESET_ID, ratioW: 2, ratioH: 3 }
    expect(pageAspect(createBook({ ...custom, orientation: 'portrait' }))).toBeCloseTo(2 / 3)
    expect(pageAspect(createBook({ ...custom, orientation: 'landscape' }))).toBeCloseTo(3 / 2)
  })

  it('falls back to the stored ratio when the preset no longer exists', () => {
    const book: Pick<Book, 'shape' | 'orientation'> = {
      shape: { presetId: 'retired', ratioW: 4, ratioH: 5 },
      orientation: 'portrait',
    }
    expect(pageAspect(book)).toBeCloseTo(0.8)
  })

  it('prefers the current preset ratio over a stale stored one', () => {
    const book: Pick<Book, 'shape' | 'orientation'> = {
      shape: { presetId: 'square', ratioW: 1, ratioH: 2 },
      orientation: 'portrait',
    }
    expect(pageAspect(book)).toBe(1)
  })
})

describe('computeBookSize', () => {
  const viewports: Record<string, Size> = {
    tall: { width: 390, height: 844 },
    wide: { width: 1440, height: 800 },
    square: { width: 1000, height: 1000 },
    ultrawide: { width: 3440, height: 1440 },
  }
  const sizes = Object.keys(DISPLAY_SIZES) as DisplaySize[]
  const modes: ViewMode[] = ['spread', 'single']
  const cases = Object.entries(viewports).flatMap(([name, viewport]) =>
    BOOK_PRESETS.flatMap((preset) =>
      orientations.flatMap((orientation) =>
        sizes.flatMap((displaySize) =>
          modes.map((mode) => ({
            name,
            viewport,
            preset: preset.id,
            orientation,
            displaySize,
            mode,
          })),
        ),
      ),
    ),
  )

  it.each(cases)(
    '$name viewport, $preset $orientation, $displaySize, $mode',
    ({ viewport, preset, orientation, displaySize, mode }) => {
      const book = createBook({ presetId: preset, orientation, displaySize })
      const page = computeBookSize(viewport, book, mode)
      const across = mode === 'spread' ? 2 : 1
      const share = DISPLAY_SIZES[displaySize]

      // never exceeds the viewport (or its display-size share)
      expect(page.width * across).toBeLessThanOrEqual(viewport.width * share)
      expect(page.height).toBeLessThanOrEqual(viewport.height * share)
      // ratio preserved within 1px on the derived axis
      const aspect = pageAspect(book)
      const ratioErrorPx = Math.min(
        Math.abs(page.width - page.height * aspect),
        Math.abs(page.height - page.width / aspect),
      )
      expect(ratioErrorPx).toBeLessThanOrEqual(1)
      // fills one axis (within rounding)
      const fillsWidth = viewport.width * share - page.width * across < across
      const fillsHeight = viewport.height * share - page.height < 1
      expect(fillsWidth || fillsHeight).toBe(true)
    },
  )

  it('is width-bound for a portrait book in spread mode on a tall viewport', () => {
    const book = createBook({ presetId: 'square', displaySize: 'fit' })
    expect(computeBookSize({ width: 1000, height: 2000 }, book, 'spread')).toEqual({
      width: Math.floor((1000 * DISPLAY_SIZES.fit) / 2),
      height: Math.floor((1000 * DISPLAY_SIZES.fit) / 2),
    })
  })

  it('is height-bound for a portrait book on a wide viewport', () => {
    const book = createBook({ presetId: 'square', displaySize: 'medium' })
    const size = computeBookSize({ width: 3000, height: 1000 }, book, 'spread')
    expect(size.height).toBe(Math.floor(1000 * DISPLAY_SIZES.medium))
  })

  it('returns zero size for an empty viewport', () => {
    expect(computeBookSize({ width: 0, height: 800 }, createBook(), 'single')).toEqual({
      width: 0,
      height: 0,
    })
  })
})

describe('viewMode', () => {
  it.each([
    [{ width: 1440, height: 900 }, 'spread'],
    [{ width: SPREAD_BREAKPOINT_PX, height: SPREAD_BREAKPOINT_PX }, 'spread'],
    [{ width: SPREAD_BREAKPOINT_PX - 1, height: 400 }, 'single'],
    [{ width: 390, height: 844 }, 'single'],
    [{ width: 1024, height: 1366 }, 'single'], // tablet portrait: wide enough but tall
    [{ width: 1366, height: 1024 }, 'spread'], // tablet landscape
  ] as const)('%o → %s', (viewport, expected) => {
    expect(viewMode(viewport)).toBe(expected)
  })
})

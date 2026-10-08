import { describe, expect, it } from 'vitest'
import { COVER_COLORS, READER_SETTINGS } from './config'
import { luminance, mixColors, readableTextColor, readerSurfaceColor } from './color'

describe('readableTextColor', () => {
  it('uses ink on light covers and paper on dark ones', () => {
    expect(readableTextColor('#FFFFFF')).toBe('#2B2724')
    expect(readableTextColor('#E8DCC8')).toBe('#2B2724')
    expect(readableTextColor('#000000')).toBe('#FBF8F2')
    expect(readableTextColor('#2F4858')).toBe('#FBF8F2')
  })

  it.each(COVER_COLORS)('picks a readable color for swatch %s', (color) => {
    const text = readableTextColor(color)
    const [hi, lo] = [luminance(color), luminance(text)].sort((a, b) => b - a)
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(3)
  })
})

describe('mixColors / readerSurfaceColor', () => {
  it('mixes channel by channel', () => {
    expect(mixColors('#FF0000', '#0000FF', 0.5)).toBe('#800080')
    expect(mixColors('#123456', '#ABCDEF', 1)).toBe('#123456')
    expect(mixColors('#123456', '#ABCDEF', 0)).toBe('#ABCDEF')
    expect(mixColors('#123456', '#ABCDEF', 7)).toBe('#123456')
  })

  it('tints the surface with a little of the cover color', () => {
    const tinted = readerSurfaceColor('#C2593A')
    expect(tinted).toBe(mixColors('#C2593A', '#EDE8DF', READER_SETTINGS.surfaceTint))
    expect(tinted).not.toBe('#EDE8DF')
    expect(readerSurfaceColor('#EDE8DF')).toBe('#EDE8DF')
  })
})

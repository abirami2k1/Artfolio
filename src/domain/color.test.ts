import { describe, expect, it } from 'vitest'
import { COVER_COLORS } from './config'
import { luminance, readableTextColor } from './color'

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

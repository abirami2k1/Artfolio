import { READER_SETTINGS } from './config'

const INK = '#2B2724'
const PAPER = '#FBF8F2'
const SURFACE = '#EDE8DF' // --color-surface

/** Relative luminance (WCAG) of a #RRGGBB color. */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/** Ink or paper, whichever reads better on `background`. */
export function readableTextColor(background: string): string {
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  const bg = luminance(background)
  return contrast(bg, luminance(INK)) >= contrast(bg, luminance(PAPER)) ? INK : PAPER
}

/** Mix two #RRGGBB colors: `share` of `a`, the rest `b`. */
export function mixColors(a: string, b: string, share: number): string {
  const t = Math.min(1, Math.max(0, share))
  const channel = (i: number) => {
    const value = parseInt(a.slice(i, i + 2), 16) * t + parseInt(b.slice(i, i + 2), 16) * (1 - t)
    return Math.round(value).toString(16).padStart(2, '0')
  }
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase()
}

/** The reading surface: the linen surface softly tinted with the book's cover color. */
export function readerSurfaceColor(coverColor: string): string {
  return mixColors(coverColor, SURFACE, READER_SETTINGS.surfaceTint)
}

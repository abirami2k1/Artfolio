const INK = '#2B2724'
const PAPER = '#FBF8F2'

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

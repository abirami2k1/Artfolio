import type { Book, Page, RenderPage, ViewMode } from './types'

export interface RenderPages {
  pages: RenderPage[]
  /** Blank pages added so every spread starts on a left page (always 0 in 'single' mode). */
  fillersInserted: number
}

/**
 * The single place stored pages become render pages: front cover, inside pages (spreads split
 * into left/right halves), back cover. Inside pages pair up left, right, left, … after the
 * front cover, so in 'spread' mode a spread landing on a right page gets a filler before it.
 */
export function expandToRenderPages(book: Pick<Book, 'pages'>, mode: ViewMode): RenderPages {
  const inside: RenderPage[] = []
  let fillersInserted = 0
  for (const page of book.pages) {
    if (page.kind !== 'spread') {
      inside.push({ kind: 'page', key: page.id, page })
      continue
    }
    const startsOnRightPage = inside.length % 2 === 1
    if (mode === 'spread' && startsOnRightPage) {
      inside.push({ kind: 'filler', key: `filler:${page.id}` })
      fillersInserted += 1
    }
    inside.push({ kind: 'spread-half', key: `${page.id}:left`, page, half: 'left' })
    inside.push({ kind: 'spread-half', key: `${page.id}:right`, page, half: 'right' })
  }
  return {
    pages: [
      { kind: 'front-cover', key: 'front-cover' },
      ...inside,
      { kind: 'back-cover', key: 'back-cover' },
    ],
    fillersInserted,
  }
}

/** Move the item at `from` to `to` (clamped). Returns a new array; out-of-range `from` is a no-op. */
export function movePage<T>(pages: readonly T[], from: number, to: number): T[] {
  const result = [...pages]
  if (from < 0 || from >= pages.length) return result
  const [moved] = result.splice(from, 1)
  result.splice(Math.min(Math.max(to, 0), result.length), 0, moved)
  return result
}

/** Insert `page` at `index` (clamped; defaults to the end). Returns a new array. */
export function insertPage<T>(pages: readonly T[], page: T, index: number = pages.length): T[] {
  const result = [...pages]
  result.splice(Math.min(Math.max(index, 0), result.length), 0, page)
  return result
}

/** Remove the page with `pageId`. Returns a new array; unknown ids are a no-op. */
export function removePage<T extends Pick<Page, 'id'>>(pages: readonly T[], pageId: string): T[] {
  return pages.filter((page) => page.id !== pageId)
}

/** Page number (1-based) of each render page; null for covers. Fillers count as pages. */
export function insidePageNumbers(pages: readonly RenderPage[]): (number | null)[] {
  let number = 0
  return pages.map((page) =>
    page.kind === 'front-cover' || page.kind === 'back-cover' ? null : ++number,
  )
}

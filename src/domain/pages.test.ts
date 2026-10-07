import { describe, expect, it } from 'vitest'
import { createPage } from './book'
import { expandToRenderPages, insertPage, movePage, removePage } from './pages'
import type { Page, RenderPage, ViewMode } from './types'

/** Build pages from a pattern: lowercase = image page, '-' = blank, uppercase = spread. */
function pagesFrom(pattern: string): Page[] {
  return [...pattern].map((ch, i) => {
    const id = ch === '-' ? `blank${i}` : ch.toLowerCase()
    if (ch === '-') return createPage(undefined, { id })
    const page = createPage(`img-${id}`, { id })
    return ch === ch.toUpperCase() ? { ...page, kind: 'spread' } : page
  })
}

/** Compact code per render page: F/B covers, page id, id:L / id:R halves, _ filler. */
function code(page: RenderPage): string {
  switch (page.kind) {
    case 'front-cover':
      return 'F'
    case 'back-cover':
      return 'B'
    case 'filler':
      return '_'
    case 'page':
      return page.page.id
    case 'spread-half':
      return `${page.page.id}:${page.half === 'left' ? 'L' : 'R'}`
  }
}

function expand(pattern: string, mode: ViewMode) {
  const { pages, fillersInserted } = expandToRenderPages({ pages: pagesFrom(pattern) }, mode)
  return { codes: pages.map(code).join(' '), fillersInserted, pages }
}

describe('expandToRenderPages — covers and plain pages', () => {
  it.each(['spread', 'single'] as const)('%s: empty book is just the two covers', (mode) => {
    expect(expand('', mode)).toMatchObject({ codes: 'F B', fillersInserted: 0 })
  })

  it.each([
    ['one page', 'a', 'F a B'],
    ['odd page count', 'abc', 'F a b c B'],
    ['even page count', 'abcd', 'F a b c d B'],
    ['blank pages', 'a-b', 'F a blank1 b B'],
  ])('%s keeps stored order in both modes', (_label, pattern, expected) => {
    expect(expand(pattern, 'spread').codes).toBe(expected)
    expect(expand(pattern, 'single').codes).toBe(expected)
  })

  it('gives every render page a unique key', () => {
    const { pages } = expand('aBcD-e', 'spread')
    expect(new Set(pages.map((p) => p.key)).size).toBe(pages.length)
  })
})

describe('expandToRenderPages — spread pairing', () => {
  it.each([
    ['spread first (left page)', 'A', 'F a:L a:R B', 0],
    ['spread after one page (would start right)', 'aB', 'F a _ b:L b:R B', 1],
    ['spread after two pages', 'abC', 'F a b c:L c:R B', 0],
    ['two spreads back to back', 'AB', 'F a:L a:R b:L b:R B', 0],
    ['page between two spreads', 'AbC', 'F a:L a:R b _ c:L c:R B', 1],
    ['two misaligned spreads', 'aBcD', 'F a _ b:L b:R c _ d:L d:R B', 2],
    ['filler fixes alignment for the next spread', 'aBC', 'F a _ b:L b:R c:L c:R B', 1],
    ['spread at the very end of an even book', 'abcdE', 'F a b c d e:L e:R B', 0],
    ['spread at the end of an odd book', 'abcD', 'F a b c _ d:L d:R B', 1],
  ])('spread mode: %s', (_label, pattern, expected, fillers) => {
    expect(expand(pattern, 'spread')).toMatchObject({ codes: expected, fillersInserted: fillers })
  })

  it('every spread starts on a left page (even inside index) in spread mode', () => {
    const { pages } = expand('aBcDeFgH-I', 'spread')
    const inside = pages.slice(1, -1)
    inside.forEach((page, index) => {
      if (page.kind === 'spread-half') expect(index % 2).toBe(page.half === 'left' ? 0 : 1)
    })
  })

  it.each([
    ['aB', 'F a b:L b:R B'],
    ['aBcD', 'F a b:L b:R c d:L d:R B'],
  ])('single mode never inserts fillers: %s', (pattern, expected) => {
    expect(expand(pattern, 'single')).toMatchObject({ codes: expected, fillersInserted: 0 })
  })

  it('spread halves point at the stored spread page', () => {
    const { pages } = expand('A', 'spread')
    const [, left, right] = pages
    expect(left).toMatchObject({
      kind: 'spread-half',
      half: 'left',
      page: { id: 'a', kind: 'spread' },
    })
    expect(right).toMatchObject({ kind: 'spread-half', half: 'right', page: { id: 'a' } })
  })
})

describe('page list helpers', () => {
  const pages = pagesFrom('abcd')
  const ids = (list: Page[]) => list.map((p) => p.id).join('')

  it.each([
    [0, 2, 'bcad'],
    [3, 0, 'dabc'],
    [1, 1, 'abcd'],
    [0, 99, 'bcda'],
    [2, -5, 'cabd'],
    [9, 0, 'abcd'],
    [-1, 0, 'abcd'],
  ])('movePage(%i → %i) gives %s', (from, to, expected) => {
    expect(ids(movePage(pages, from, to))).toBe(expected)
  })

  it.each([
    [undefined, 'abcdx'],
    [0, 'xabcd'],
    [2, 'abxcd'],
    [99, 'abcdx'],
    [-3, 'xabcd'],
  ])('insertPage at %s gives %s', (index, expected) => {
    expect(ids(insertPage(pages, createPage(undefined, { id: 'x' }), index))).toBe(expected)
  })

  it('removePage drops by id and ignores unknown ids', () => {
    expect(ids(removePage(pages, 'b'))).toBe('acd')
    expect(ids(removePage(pages, 'zzz'))).toBe('abcd')
  })

  it('never mutates the input', () => {
    const snapshot = [...pages]
    movePage(pages, 0, 3)
    insertPage(pages, createPage(), 1)
    removePage(pages, 'a')
    expect(pages).toEqual(snapshot)
  })
})

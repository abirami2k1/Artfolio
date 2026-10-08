import { describe, expect, it } from 'vitest'
import { listNames, rejectedMessage, summaryMessage } from './importMessages'

describe('import messages', () => {
  it('lists up to three names, then a count', () => {
    expect(listNames(['a'])).toBe('a')
    expect(listNames(['a', 'b', 'c'])).toBe('a, b, c')
    expect(listNames(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c and 2 more')
  })

  it('names rejected files', () => {
    expect(rejectedMessage(['x.pdf'])).toBe(
      'Skipped a file that isn’t a JPEG, PNG, WebP or HEIC image: x.pdf',
    )
    expect(rejectedMessage(['x.pdf', 'y.txt'])).toMatch(/^Skipped 2 files that aren’t/)
  })

  it('summarizes successes and failures', () => {
    expect(summaryMessage({ added: 1, failures: [] })).toBe('Added 1 page')
    expect(summaryMessage({ added: 4, failures: [{ name: 'a.heic', reason: 'no HEIC' }] })).toBe(
      'Added 4 pages. Couldn’t import 1: a.heic (no HEIC)',
    )
  })
})

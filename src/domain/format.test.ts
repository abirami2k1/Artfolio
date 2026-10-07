import { describe, expect, it } from 'vitest'
import { formatBytes, pageCountLabel } from './format'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [-1, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [10 * 1024 * 1024, '10 MB'],
    [123.4 * 1024 * 1024, '123 MB'],
    [2.25 * 1024 ** 3, '2.25 GB'],
  ])('%d → %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})

describe('pageCountLabel', () => {
  it('pluralizes', () => {
    expect(pageCountLabel(0)).toBe('0 pages')
    expect(pageCountLabel(1)).toBe('1 page')
    expect(pageCountLabel(12)).toBe('12 pages')
  })
})

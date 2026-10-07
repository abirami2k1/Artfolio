import { describe, expect, it } from 'vitest'
import { naturalCompare, naturalSort, naturalSortBy } from './sort'

describe('naturalSort', () => {
  it('orders numbers by value, not by digits', () => {
    expect(naturalSort(['10.png', '2.png', '1.png', '21.png', '3.png'])).toEqual([
      '1.png',
      '2.png',
      '3.png',
      '10.png',
      '21.png',
    ])
  })

  it('handles numbers inside names', () => {
    expect(naturalSort(['page 10.jpg', 'page 9.jpg', 'page 100.jpg', 'page 1.jpg'])).toEqual([
      'page 1.jpg',
      'page 9.jpg',
      'page 10.jpg',
      'page 100.jpg',
    ])
  })

  it('is case-insensitive', () => {
    expect(naturalSort(['b.png', 'C.png', 'a.png'])).toEqual(['a.png', 'b.png', 'C.png'])
    expect(naturalSort(['Scan 2.png', 'scan 10.png', 'SCAN 1.png'])).toEqual([
      'SCAN 1.png',
      'Scan 2.png',
      'scan 10.png',
    ])
  })

  it('is deterministic for names that differ only by case', () => {
    expect(naturalSort(['a.png', 'A.png'])).toEqual(naturalSort(['A.png', 'a.png']))
  })

  it('does not mutate the input', () => {
    const names = ['2.png', '1.png']
    naturalSort(names)
    expect(names).toEqual(['2.png', '1.png'])
  })
})

describe('naturalSortBy', () => {
  it('sorts objects by a name', () => {
    const files = [{ name: '10.png' }, { name: '2.png' }]
    expect(naturalSortBy(files, (f) => f.name).map((f) => f.name)).toEqual(['2.png', '10.png'])
  })
})

describe('naturalCompare', () => {
  it('returns 0 only for identical strings', () => {
    expect(naturalCompare('a', 'a')).toBe(0)
    expect(naturalCompare('a', 'A')).not.toBe(0)
  })
})

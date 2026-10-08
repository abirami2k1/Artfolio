import { describe, expect, it } from 'vitest'
import { classifyImportFile, importAcceptAttribute, planImport } from './import'

const file = (name: string, type = '') => ({ name, type })

describe('classifyImportFile', () => {
  it.each([
    ['a.jpg', 'image/jpeg', 'image'],
    ['a.png', 'image/png', 'image'],
    ['a.webp', 'image/webp', 'image'],
    ['a.heic', 'image/heic', 'heic'],
    ['a.heif', 'image/heif', 'heic'],
    ['a.pdf', 'application/pdf', 'unsupported'],
    ['a.svg', 'image/svg+xml', 'unsupported'],
    ['notes.txt', 'text/plain', 'unsupported'],
  ])('%s (%s) → %s', (name, type, kind) => {
    expect(classifyImportFile(file(name, type))).toBe(kind)
  })

  it('trusts the MIME type over the extension', () => {
    expect(classifyImportFile(file('photo.png', 'application/pdf'))).toBe('unsupported')
    expect(classifyImportFile(file('scan', 'image/png'))).toBe('image')
  })

  it('falls back to the extension (any case) when there is no MIME type', () => {
    expect(classifyImportFile(file('IMG_0001.HEIC'))).toBe('heic')
    expect(classifyImportFile(file('page.JPEG'))).toBe('image')
    expect(classifyImportFile(file('README'))).toBe('unsupported')
    expect(classifyImportFile(file('archive.zip'))).toBe('unsupported')
  })
})

describe('planImport', () => {
  it('accepts images in natural order and rejects the rest', () => {
    const files = [
      file('10.png', 'image/png'),
      file('notes.txt', 'text/plain'),
      file('2.png', 'image/png'),
      file('1.HEIC'),
      file('B.jpg', 'image/jpeg'),
    ]
    const { accepted, rejected } = planImport(files)
    expect(accepted.map((f) => f.name)).toEqual(['1.HEIC', '2.png', '10.png', 'B.jpg'])
    expect(rejected.map((f) => f.name)).toEqual(['notes.txt'])
  })

  it('keeps the original objects', () => {
    const f = file('a.png', 'image/png')
    expect(planImport([f]).accepted[0]).toBe(f)
  })
})

describe('importAcceptAttribute', () => {
  it('lists MIME types and extensions', () => {
    const accept = importAcceptAttribute().split(',')
    expect(accept).toEqual(expect.arrayContaining(['image/jpeg', 'image/heic', '.png', '.heic']))
  })
})

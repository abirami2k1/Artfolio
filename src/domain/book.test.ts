import { describe, expect, it } from 'vitest'
import { createBook, createPage, DEFAULT_TRANSFORM } from './book'
import { BOOK_DEFAULTS, BOOK_PRESETS, CUSTOM_PRESET_ID } from './config'
import { BookSchema, CURRENT_SCHEMA_VERSION, PageSchema } from './schemas'

describe('createBook', () => {
  it('fills sane defaults that pass the schema', () => {
    const book = createBook({}, { id: 'b1', now: 123 })
    expect(BookSchema.parse(book)).toEqual(book)
    expect(book).toMatchObject({
      id: 'b1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      title: BOOK_DEFAULTS.title,
      displaySize: BOOK_DEFAULTS.displaySize,
      binding: 'left',
      pages: [],
      createdAt: 123,
      updatedAt: 123,
    })
  })

  it('generates unique ids by default', () => {
    expect(createBook().id).not.toBe(createBook().id)
  })

  it.each(BOOK_PRESETS.map((p) => [p.id, p] as const))(
    'copies the %s preset ratio',
    (id, preset) => {
      const book = createBook({ presetId: id })
      expect(book.shape).toEqual({ presetId: id, ratioW: preset.ratioW, ratioH: preset.ratioH })
    },
  )

  it('uses the natural orientation unless one is given', () => {
    expect(createBook({ presetId: 'a-series' }).orientation).toBe('portrait')
    expect(createBook({ presetId: 'picture' }).orientation).toBe('landscape')
    expect(createBook({ presetId: 'picture', orientation: 'portrait' }).orientation).toBe(
      'portrait',
    )
  })

  it('accepts a custom ratio', () => {
    const book = createBook({ presetId: CUSTOM_PRESET_ID, ratioW: 3, ratioH: 2 })
    expect(book.shape).toEqual({ presetId: CUSTOM_PRESET_ID, ratioW: 3, ratioH: 2 })
    expect(BookSchema.safeParse(book).success).toBe(true)
  })

  it('rejects a custom shape without a valid ratio, and unknown presets', () => {
    expect(() => createBook({ presetId: CUSTOM_PRESET_ID })).toThrow()
    expect(() => createBook({ presetId: CUSTOM_PRESET_ID, ratioW: -1, ratioH: 2 })).toThrow()
    expect(() => createBook({ presetId: 'scroll' })).toThrow(/Unknown book preset/)
  })

  it('trims the title and falls back when empty', () => {
    expect(createBook({ title: '  Moths  ' }).title).toBe('Moths')
    expect(createBook({ title: '   ' }).title).toBe(BOOK_DEFAULTS.title)
  })
})

describe('createPage', () => {
  it('makes an image page with centered, unscaled contain fit', () => {
    const page = createPage('img1', { id: 'p1' })
    expect(PageSchema.parse(page)).toEqual(page)
    expect(page).toEqual({
      id: 'p1',
      kind: 'image',
      imageId: 'img1',
      fit: 'contain',
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
      background: null,
      margin: 0,
    })
  })

  it('makes a blank page without an image', () => {
    const page = createPage()
    expect(page.kind).toBe('blank')
    expect(page).not.toHaveProperty('imageId')
    expect(PageSchema.safeParse(page).success).toBe(true)
  })

  it('does not share the default transform object', () => {
    expect(createPage().transform).not.toBe(DEFAULT_TRANSFORM)
  })
})

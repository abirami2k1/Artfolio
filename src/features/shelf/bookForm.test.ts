import { describe, expect, it } from 'vitest'
import { createBook } from '../../domain/book'
import { BOOK_DEFAULTS, CUSTOM_PRESET_ID } from '../../domain/config'
import { BookSchema } from '../../domain/schemas'
import {
  defaultFormValues,
  formValuesFromBook,
  isFormValid,
  previewBook,
  toCreateInput,
  toSettings,
  withShape,
} from './bookForm'

describe('book form', () => {
  it('defaults create a valid default book', () => {
    const values = defaultFormValues()
    expect(isFormValid(values)).toBe(true)
    const book = createBook(toCreateInput(values))
    expect(BookSchema.safeParse(book).success).toBe(true)
    expect(book).toMatchObject({
      title: BOOK_DEFAULTS.title,
      shape: { presetId: BOOK_DEFAULTS.presetId },
    })
  })

  it('switching preset follows its natural orientation', () => {
    const values = withShape(defaultFormValues(), { presetId: 'picture' })
    expect(values.orientation).toBe('landscape')
    expect(withShape(values, { presetId: 'letter' }).orientation).toBe('portrait')
  })

  it('custom ratios are used as typed and validated', () => {
    const custom = withShape(defaultFormValues(), {
      presetId: CUSTOM_PRESET_ID,
      customW: 16,
      customH: 9,
    })
    expect(custom.orientation).toBe('landscape')
    expect(previewBook(custom).shape).toEqual({ presetId: CUSTOM_PRESET_ID, ratioW: 16, ratioH: 9 })
    expect(createBook(toCreateInput(custom)).shape).toEqual({
      presetId: CUSTOM_PRESET_ID,
      ratioW: 16,
      ratioH: 9,
    })
    expect(isFormValid({ ...custom, customW: 0 })).toBe(false)
    expect(isFormValid({ ...custom, customH: Number.NaN })).toBe(false)
  })

  it('round-trips a book through the settings form', () => {
    const book = createBook({ title: 'Moths', presetId: 'square', coverColor: '#2F4858' })
    const values = formValuesFromBook(book)
    expect(values).toMatchObject({ title: 'Moths', presetId: 'square', coverColor: '#2F4858' })
    const settings = toSettings(
      { ...values, title: '  Night Moths ', coverColor: '#5B7553' },
      book.cover,
    )
    expect(settings).toMatchObject({
      title: 'Night Moths',
      shape: book.shape,
      cover: { ...book.cover, color: '#5B7553' },
    })
    expect(BookSchema.safeParse({ ...book, ...settings }).success).toBe(true)
  })

  it('shows books with a retired preset as custom', () => {
    const book = { ...createBook(), shape: { presetId: 'retired', ratioW: 4, ratioH: 5 } }
    expect(formValuesFromBook(book)).toMatchObject({
      presetId: CUSTOM_PRESET_ID,
      customW: 4,
      customH: 5,
    })
  })

  it('a blank title in settings falls back to the default title', () => {
    const book = createBook()
    expect(toSettings({ ...formValuesFromBook(book), title: '  ' }, book.cover).title).toBe(
      BOOK_DEFAULTS.title,
    )
  })
})

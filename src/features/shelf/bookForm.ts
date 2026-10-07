import { findPreset, naturalOrientation, type CreateBookInput } from '../../domain/book'
import { BOOK_DEFAULTS, CUSTOM_PRESET_ID } from '../../domain/config'
import type { Book, BookShape, DisplaySize, Orientation } from '../../domain/types'
import type { BookSettings } from '../../stores/libraryStore'

/** Values edited in the create-book and book-settings dialogs. */
export interface BookFormValues {
  title: string
  presetId: string
  customW: number
  customH: number
  orientation: Orientation
  displaySize: DisplaySize
  coverColor: string
}

type FormSource = Pick<Book, 'title' | 'shape' | 'orientation' | 'displaySize' | 'cover'>

export function shapeFromForm(values: BookFormValues): BookShape {
  const preset = findPreset(values.presetId)
  return preset
    ? { presetId: preset.id, ratioW: preset.ratioW, ratioH: preset.ratioH }
    : { presetId: CUSTOM_PRESET_ID, ratioW: values.customW, ratioH: values.customH }
}

export function defaultFormValues(): BookFormValues {
  const preset = findPreset(BOOK_DEFAULTS.presetId)!
  return {
    title: '',
    presetId: preset.id,
    customW: preset.ratioW,
    customH: preset.ratioH,
    orientation: naturalOrientation(preset),
    displaySize: BOOK_DEFAULTS.displaySize,
    coverColor: BOOK_DEFAULTS.coverColor,
  }
}

export function formValuesFromBook(book: FormSource): BookFormValues {
  return {
    title: book.title,
    presetId: findPreset(book.shape.presetId) ? book.shape.presetId : CUSTOM_PRESET_ID,
    customW: book.shape.ratioW,
    customH: book.shape.ratioH,
    orientation: book.orientation,
    displaySize: book.displaySize,
    coverColor: book.cover.color,
  }
}

/** Switch shape; orientation follows the new shape's natural orientation. */
export function withShape(
  values: BookFormValues,
  change: Partial<Pick<BookFormValues, 'presetId' | 'customW' | 'customH'>>,
): BookFormValues {
  const next = { ...values, ...change }
  const shape = shapeFromForm(next)
  return isValidRatio(shape) ? { ...next, orientation: naturalOrientation(shape) } : next
}

function isValidRatio({ ratioW, ratioH }: Pick<BookShape, 'ratioW' | 'ratioH'>): boolean {
  return Number.isFinite(ratioW) && Number.isFinite(ratioH) && ratioW > 0 && ratioH > 0
}

export function isFormValid(values: BookFormValues): boolean {
  return isValidRatio(shapeFromForm(values))
}

/** Shape + orientation for the live preview. */
export function previewBook(values: BookFormValues): Pick<Book, 'shape' | 'orientation'> {
  return { shape: shapeFromForm(values), orientation: values.orientation }
}

export function toCreateInput(values: BookFormValues): CreateBookInput {
  const shape = shapeFromForm(values)
  return {
    title: values.title,
    presetId: shape.presetId,
    ratioW: shape.ratioW,
    ratioH: shape.ratioH,
    orientation: values.orientation,
    displaySize: values.displaySize,
    coverColor: values.coverColor,
  }
}

export function toSettings(values: BookFormValues, cover: Book['cover']): BookSettings {
  return {
    title: values.title.trim() || BOOK_DEFAULTS.title,
    shape: shapeFromForm(values),
    orientation: values.orientation,
    displaySize: values.displaySize,
    cover: { ...cover, color: values.coverColor },
  }
}

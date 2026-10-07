import { BOOK_DEFAULTS, BOOK_PRESETS, CUSTOM_PRESET_ID } from './config'
import { CURRENT_SCHEMA_VERSION } from './schemas'
import type { Book, BookShape, DisplaySize, Orientation, Page, PageTransform } from './types'

export const DEFAULT_TRANSFORM: Readonly<PageTransform> = { x: 0, y: 0, scale: 1, rotation: 0 }

export type BookPreset = (typeof BOOK_PRESETS)[number]

export interface CreateBookInput {
  title?: string
  /** A BOOK_PRESETS id, or CUSTOM_PRESET_ID together with ratioW/ratioH. */
  presetId?: string
  ratioW?: number
  ratioH?: number
  /** Defaults to the shape's natural orientation (wider than tall → landscape). */
  orientation?: Orientation
  displaySize?: DisplaySize
  coverColor?: string
  paperColor?: string
}

/** Overrides for ids and clock, so callers (and tests) can make output deterministic. */
export interface CreateOptions {
  id?: string
  now?: number
}

export function findPreset(presetId: string): BookPreset | undefined {
  return BOOK_PRESETS.find((preset) => preset.id === presetId)
}

function resolveShape(input: CreateBookInput): BookShape {
  const presetId = input.presetId ?? BOOK_DEFAULTS.presetId
  if (presetId === CUSTOM_PRESET_ID) {
    const { ratioW, ratioH } = input
    if (!ratioW || !ratioH || ratioW <= 0 || ratioH <= 0) {
      throw new Error('A custom shape needs a positive ratioW and ratioH')
    }
    return { presetId, ratioW, ratioH }
  }
  const preset = findPreset(presetId)
  if (!preset) throw new Error(`Unknown book preset: ${presetId}`)
  return { presetId, ratioW: preset.ratioW, ratioH: preset.ratioH }
}

export function naturalOrientation(shape: Pick<BookShape, 'ratioW' | 'ratioH'>): Orientation {
  return shape.ratioW > shape.ratioH ? 'landscape' : 'portrait'
}

export function createBook(input: CreateBookInput = {}, options: CreateOptions = {}): Book {
  const shape = resolveShape(input)
  const now = options.now ?? Date.now()
  return {
    id: options.id ?? crypto.randomUUID(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: input.title?.trim() || BOOK_DEFAULTS.title,
    shape,
    orientation: input.orientation ?? naturalOrientation(shape),
    displaySize: input.displaySize ?? BOOK_DEFAULTS.displaySize,
    binding: 'left',
    cover: {
      color: input.coverColor ?? BOOK_DEFAULTS.coverColor,
      showTitle: BOOK_DEFAULTS.showTitle,
    },
    paperColor: input.paperColor ?? BOOK_DEFAULTS.paperColor,
    pages: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** An image page when given an image id, otherwise a blank page. */
export function createPage(imageId?: string, options: Pick<CreateOptions, 'id'> = {}): Page {
  return {
    id: options.id ?? crypto.randomUUID(),
    kind: imageId ? 'image' : 'blank',
    ...(imageId ? { imageId } : {}),
    fit: 'contain',
    transform: { ...DEFAULT_TRANSFORM },
    background: null,
    margin: 0,
  }
}

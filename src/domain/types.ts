import type { z } from 'zod'
import type {
  BookSchema,
  BookShapeSchema,
  DisplaySizeSchema,
  FitSchema,
  ImageAssetSchema,
  OrientationSchema,
  PageKindSchema,
  PageSchema,
  PageTransformSchema,
} from './schemas'

// Persisted data: inferred from the Zod schemas.
export type Book = z.infer<typeof BookSchema>
export type BookShape = z.infer<typeof BookShapeSchema>
export type Page = z.infer<typeof PageSchema>
export type PageKind = z.infer<typeof PageKindSchema>
export type PageTransform = z.infer<typeof PageTransformSchema>
export type Fit = z.infer<typeof FitSchema>
export type Orientation = z.infer<typeof OrientationSchema>
export type DisplaySize = z.infer<typeof DisplaySizeSchema>
export type ImageAsset = z.infer<typeof ImageAssetSchema>

// Runtime-only geometry (never persisted).
export interface Size {
  width: number
  height: number
}

/** 'spread' = two pages side by side; 'single' = one page at a time. */
export type ViewMode = 'spread' | 'single'

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Where to draw an image, in px relative to its page's top-left corner. `width`/`height` are
 * the unrotated element size; `rotation` (degrees) turns it around its center. The renderer
 * clips the image to `frame` (the page's content box inside its margin).
 */
export interface ImagePlacement extends Rect {
  rotation: number
  frame: Rect
}

export type SpreadHalf = 'left' | 'right'

export type SpreadPlacement = Record<SpreadHalf, ImagePlacement>

/** One page as drawn by the reader/editor, after covers, spread halves and fillers are added. */
export type RenderPage =
  | { kind: 'front-cover'; key: 'front-cover' }
  | { kind: 'back-cover'; key: 'back-cover' }
  | { kind: 'page'; key: string; page: Page } // an image or blank page
  | { kind: 'spread-half'; key: string; page: Page; half: SpreadHalf }
  // blank inserted so a spread (`beforePageId`) starts on a left page, or to pair an odd last page
  | { kind: 'filler'; key: string; beforePageId?: string }

/**
 * What the reader shows at once. In 'spread' mode a `pair` is an open book (a side is null
 * only next to a cover, which lies closed on its own side); in 'single' mode every page is a
 * `single`.
 */
export type Spread =
  | { kind: 'pair'; key: string; left: RenderPage | null; right: RenderPage | null }
  | { kind: 'single'; key: string; page: RenderPage }

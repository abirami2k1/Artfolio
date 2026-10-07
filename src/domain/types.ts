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

export interface SpreadPlacement {
  left: ImagePlacement
  right: ImagePlacement
}

import { z } from 'zod'

/** Bump when the persisted Book shape changes, and add a step to `migrateBook`. */
export const CURRENT_SCHEMA_VERSION = 1

const id = z.string().min(1)
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #RRGGBB color')
const timestamp = z.number().int().nonnegative() // epoch milliseconds
const positive = z.number().finite().positive()

export const FitSchema = z.enum(['contain', 'cover', 'stretch'])
export const OrientationSchema = z.enum(['portrait', 'landscape'])
export const DisplaySizeSchema = z.enum(['fit', 'large', 'medium'])
export const PageKindSchema = z.enum(['image', 'blank', 'spread'])

/** Normalized, resolution-independent image transform (see coding-standards). */
export const PageTransformSchema = z.object({
  x: z.number().finite(), // image-center offset, fraction of page (or spread) width
  y: z.number().finite(), // image-center offset, fraction of page height
  scale: positive, // multiplier on top of the fit size
  rotation: z.number().finite(), // degrees
})

export const PageSchema = z
  .object({
    id,
    kind: PageKindSchema,
    imageId: id.optional(),
    fit: FitSchema,
    transform: PageTransformSchema,
    background: hexColor.nullable(), // null = use the book's paper color
    margin: z.number().min(0).lt(0.5), // fraction of the page's shorter side
  })
  .superRefine((page, ctx) => {
    const needsImage = page.kind !== 'blank'
    if (needsImage && !page.imageId) {
      ctx.addIssue({
        code: 'custom',
        path: ['imageId'],
        message: `A ${page.kind} page needs an image`,
      })
    }
    if (!needsImage && page.imageId) {
      ctx.addIssue({ code: 'custom', path: ['imageId'], message: 'A blank page has no image' })
    }
  })

export const BookShapeSchema = z.object({
  presetId: id, // a BOOK_PRESETS id or CUSTOM_PRESET_ID; unknown ids fall back to the stored ratio
  ratioW: positive,
  ratioH: positive,
})

export const BookSchema = z.object({
  id,
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  title: z.string().trim().min(1).max(200),
  shape: BookShapeSchema,
  orientation: OrientationSchema,
  displaySize: DisplaySizeSchema,
  binding: z.literal('left'),
  cover: z.object({
    color: hexColor,
    imageId: id.optional(),
    showTitle: z.boolean(),
  }),
  paperColor: hexColor,
  pages: z.array(PageSchema),
  createdAt: timestamp,
  updatedAt: timestamp,
  drive: z
    .object({
      folderId: id,
      fileId: id,
      syncedAt: timestamp,
    })
    .optional(),
})

export const ImageAssetSchema = z.object({
  id,
  bookId: id,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mime: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sourceName: z.string(),
  displayBlobKey: id,
  thumbBlobKey: id,
  drive: z
    .object({
      fileId: id,
      thumbFileId: id,
    })
    .optional(),
})

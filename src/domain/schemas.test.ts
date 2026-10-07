import { describe, expect, it } from 'vitest'
import { createBook, createPage } from './book'
import { BookSchema, ImageAssetSchema, PageSchema } from './schemas'
import type { ImageAsset } from './types'

const book = createBook({ title: 'Moths' }, { id: 'b1', now: 1000 })
const imagePage = createPage('img1', { id: 'p1' })

const asset: ImageAsset = {
  id: 'img1',
  bookId: 'b1',
  width: 1200,
  height: 1600,
  mime: 'image/webp',
  bytes: 42000,
  sourceName: '01.png',
  displayBlobKey: 'img1:display',
  thumbBlobKey: 'img1:thumb',
}

describe('BookSchema', () => {
  it('accepts a freshly created book with pages', () => {
    expect(BookSchema.safeParse({ ...book, pages: [imagePage, createPage()] }).success).toBe(true)
  })

  it.each([
    ['wrong schemaVersion', { schemaVersion: 2 }],
    ['blank title', { title: '   ' }],
    ['bad cover color', { cover: { ...book.cover, color: 'red' } }],
    ['non-positive ratio', { shape: { ...book.shape, ratioW: 0 } }],
    ['unknown orientation', { orientation: 'diagonal' }],
    ['unsupported binding', { binding: 'right' }],
    ['negative timestamp', { updatedAt: -1 }],
  ])('rejects %s', (_label, patch) => {
    expect(BookSchema.safeParse({ ...book, ...patch }).success).toBe(false)
  })
})

describe('PageSchema', () => {
  it.each([
    ['image page without image', { kind: 'image', imageId: undefined }],
    ['spread page without image', { kind: 'spread', imageId: undefined }],
    ['blank page with image', { kind: 'blank' }],
    ['margin of half the page', { margin: 0.5 }],
    ['zero scale', { transform: { ...imagePage.transform, scale: 0 } }],
    ['unknown fit', { fit: 'tile' }],
  ])('rejects %s', (_label, patch) => {
    expect(PageSchema.safeParse({ ...imagePage, ...patch }).success).toBe(false)
  })

  it('accepts a spread page with an image', () => {
    expect(PageSchema.safeParse({ ...imagePage, kind: 'spread' }).success).toBe(true)
  })
})

describe('ImageAssetSchema', () => {
  it('accepts a valid asset', () => {
    expect(ImageAssetSchema.safeParse(asset).success).toBe(true)
  })

  it('rejects fractional dimensions', () => {
    expect(ImageAssetSchema.safeParse({ ...asset, width: 10.5 }).success).toBe(false)
  })
})

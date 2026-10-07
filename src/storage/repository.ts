import type { Book, ImageAsset } from '../domain/types'

export type ImageVariant = 'display' | 'thumb'

/** What the shelf needs to draw a closed book without loading its pages. */
export type BookSummary = Pick<
  Book,
  | 'id'
  | 'title'
  | 'shape'
  | 'orientation'
  | 'displaySize'
  | 'cover'
  | 'paperColor'
  | 'createdAt'
  | 'updatedAt'
> & { pageCount: number }

/** A processed image ready to store: the resized display and thumbnail blobs plus metadata. */
export interface ImageAssetInput {
  id?: string
  bookId: string
  sourceName: string
  width: number
  height: number
  display: Blob
  thumb: Blob
}

/** The only way UI and stores reach persisted data (local IndexedDB now, Drive later). */
export interface BookRepository {
  listBooks(): Promise<BookSummary[]>
  getBook(id: string): Promise<Book | null>
  saveBook(book: Book): Promise<void>
  /** Deletes the book and every image (and blob) that belongs to it. */
  deleteBook(id: string): Promise<void>
  putImage(asset: ImageAssetInput): Promise<ImageAsset>
  getImage(imageId: string): Promise<ImageAsset | null>
  getImageBlob(imageId: string, variant: ImageVariant): Promise<Blob | null>
  deleteImage(imageId: string): Promise<void>
}

export function toBookSummary(book: Book): BookSummary {
  const { id, title, shape, orientation, displaySize, cover, paperColor, createdAt, updatedAt } =
    book
  return {
    id,
    title,
    shape,
    orientation,
    displaySize,
    cover,
    paperColor,
    createdAt,
    updatedAt,
    pageCount: book.pages.length,
  }
}

export function blobKey(imageId: string, variant: ImageVariant): string {
  return `${imageId}:${variant}`
}

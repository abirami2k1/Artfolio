import { migrateBook } from '../../domain/migrate'
import { BookSchema, ImageAssetSchema } from '../../domain/schemas'
import type { Book, ImageAsset } from '../../domain/types'
import {
  blobKey,
  toBookSummary,
  type BookRepository,
  type BookSummary,
  type ImageAssetInput,
  type ImageVariant,
} from '../repository'

/** In-memory BookRepository for tests (stores, sync engine). Same validation as LocalRepository. */
export class MemoryRepository implements BookRepository {
  readonly books = new Map<string, unknown>()
  readonly images = new Map<string, ImageAsset>()
  readonly blobs = new Map<string, Blob>()

  async listBooks(): Promise<BookSummary[]> {
    return [...this.books.values()]
      .map((raw) => toBookSummary(migrateBook(raw)))
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  async getBook(id: string): Promise<Book | null> {
    const raw = this.books.get(id)
    return raw ? migrateBook(structuredClone(raw)) : null
  }

  async saveBook(book: Book): Promise<void> {
    this.books.set(book.id, structuredClone(BookSchema.parse(book)))
  }

  async deleteBook(id: string): Promise<void> {
    for (const asset of [...this.images.values()]) {
      if (asset.bookId === id) await this.deleteImage(asset.id)
    }
    this.books.delete(id)
  }

  async putImage(input: ImageAssetInput): Promise<ImageAsset> {
    const id = input.id ?? crypto.randomUUID()
    const asset = ImageAssetSchema.parse({
      id,
      bookId: input.bookId,
      width: input.width,
      height: input.height,
      mime: input.display.type || 'application/octet-stream',
      bytes: input.display.size,
      sourceName: input.sourceName,
      displayBlobKey: blobKey(id, 'display'),
      thumbBlobKey: blobKey(id, 'thumb'),
    })
    this.images.set(id, asset)
    this.blobs.set(blobKey(id, 'display'), input.display)
    this.blobs.set(blobKey(id, 'thumb'), input.thumb)
    return asset
  }

  async getImage(imageId: string): Promise<ImageAsset | null> {
    return this.images.get(imageId) ?? null
  }

  async getImageBlob(imageId: string, variant: ImageVariant): Promise<Blob | null> {
    return this.blobs.get(blobKey(imageId, variant)) ?? null
  }

  async deleteImage(imageId: string): Promise<void> {
    this.images.delete(imageId)
    this.blobs.delete(blobKey(imageId, 'display'))
    this.blobs.delete(blobKey(imageId, 'thumb'))
  }
}

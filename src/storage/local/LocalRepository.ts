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
import type { BlobRecord, FolioDatabase } from './db'

/** IndexedDB (Dexie) repository: the working copy the UI uses. */
export class LocalRepository implements BookRepository {
  private readonly db: FolioDatabase

  constructor(db: FolioDatabase) {
    this.db = db
  }

  async listBooks(): Promise<BookSummary[]> {
    const rows = await this.db.books.toArray()
    const summaries: BookSummary[] = []
    for (const row of rows) {
      try {
        summaries.push(toBookSummary(migrateBook(row)))
      } catch {
        // A corrupt or unknown-version book is skipped rather than breaking the shelf.
      }
    }
    return summaries.sort((a, b) => a.createdAt - b.createdAt)
  }

  async getBook(id: string): Promise<Book | null> {
    const row = await this.db.books.get(id)
    return row ? migrateBook(row) : null
  }

  async saveBook(book: Book): Promise<void> {
    await this.db.books.put(BookSchema.parse(book))
  }

  async deleteBook(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.books, this.db.images, this.db.blobs, async () => {
      const imageIds = (await this.db.images.where('bookId').equals(id).primaryKeys()) as string[]
      await this.db.blobs.where('imageId').anyOf(imageIds).delete()
      await this.db.images.bulkDelete(imageIds)
      await this.db.books.delete(id)
    })
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
    const blobs = await Promise.all([
      toBlobRecord(id, 'display', input.display),
      toBlobRecord(id, 'thumb', input.thumb),
    ])
    await this.db.transaction('rw', this.db.images, this.db.blobs, async () => {
      await this.db.images.put(asset)
      await this.db.blobs.bulkPut(blobs)
    })
    return asset
  }

  async getImage(imageId: string): Promise<ImageAsset | null> {
    const row = await this.db.images.get(imageId)
    return row ? ImageAssetSchema.parse(row) : null
  }

  async getImageBlob(imageId: string, variant: ImageVariant): Promise<Blob | null> {
    const row = await this.db.blobs.get(blobKey(imageId, variant))
    return row ? new Blob([new Uint8Array(row.data)], { type: row.mime }) : null
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.db.transaction('rw', this.db.images, this.db.blobs, async () => {
      await this.db.blobs.where('imageId').equals(imageId).delete()
      await this.db.images.delete(imageId)
    })
  }
}

async function toBlobRecord(
  imageId: string,
  variant: ImageVariant,
  blob: Blob,
): Promise<BlobRecord> {
  return {
    key: blobKey(imageId, variant),
    imageId,
    variant,
    mime: blob.type || 'application/octet-stream',
    data: await blob.arrayBuffer(),
  }
}

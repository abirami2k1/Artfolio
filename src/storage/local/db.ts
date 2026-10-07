import Dexie, { type Table } from 'dexie'
import type { ImageAsset } from '../../domain/types'
import type { ImageVariant } from '../repository'

/**
 * Image bytes are stored as ArrayBuffer + mime rather than Blob: Blobs in IndexedDB have been
 * unreliable in some browsers (and in test environments). Converted back to Blob on read.
 */
export interface BlobRecord {
  key: string
  imageId: string
  variant: ImageVariant
  mime: string
  data: ArrayBuffer
}

/** Raw book JSON as stored; only trusted after `migrateBook`. */
export type StoredBook = Record<string, unknown> & { id: string }

export class FolioDatabase extends Dexie {
  /** Book JSON, stored as-is and parsed with `migrateBook` on every read. */
  declare books: Table<StoredBook, string>
  declare images: Table<ImageAsset, string>
  declare blobs: Table<BlobRecord, string>

  constructor(name = 'folio') {
    super(name)
    this.version(1).stores({
      books: 'id',
      images: 'id, bookId',
      blobs: 'key, imageId',
    })
  }
}

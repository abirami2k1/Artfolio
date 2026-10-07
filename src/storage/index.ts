import { FolioDatabase } from './local/db'
import { LocalRepository } from './local/LocalRepository'
import type { BookRepository } from './repository'

export type { BookRepository, BookSummary, ImageAssetInput, ImageVariant } from './repository'

/** The app's working-copy repository. UI and stores import this, never Dexie. */
export const repository: BookRepository = new LocalRepository(new FolioDatabase())

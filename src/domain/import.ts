import { IMPORT_FORMATS } from './config'
import { naturalSortBy } from './sort'

/** 'heic' is accepted but may fail to decode, depending on the browser. */
export type ImportFileKind = 'image' | 'heic' | 'unsupported'

/** The bits of a File the import rules look at. */
export interface ImportFileInfo {
  name: string
  type: string
}

function extension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

const includes = (list: readonly string[], value: string) => list.includes(value)

/** Classify by MIME type, falling back to the extension when the browser reports none. */
export function classifyImportFile(file: ImportFileInfo): ImportFileKind {
  const type = file.type.toLowerCase()
  const ext = extension(file.name)
  if (includes(IMPORT_FORMATS.heicMimes, type)) return 'heic'
  if (includes(IMPORT_FORMATS.mimes, type)) return 'image'
  if (type) return 'unsupported'
  if (includes(IMPORT_FORMATS.heicExtensions, ext)) return 'heic'
  if (includes(IMPORT_FORMATS.extensions, ext)) return 'image'
  return 'unsupported'
}

/** Split picked files into those to import (in natural filename order) and those to reject. */
export function planImport<T extends ImportFileInfo>(
  files: readonly T[],
): { accepted: T[]; rejected: T[] } {
  const accepted: T[] = []
  const rejected: T[] = []
  for (const file of files) {
    ;(classifyImportFile(file) === 'unsupported' ? rejected : accepted).push(file)
  }
  return { accepted: naturalSortBy(accepted, (file) => file.name), rejected }
}

/** The `accept` attribute for a file input offering every importable format. */
export function importAcceptAttribute(): string {
  const mimes = [...IMPORT_FORMATS.mimes, ...IMPORT_FORMATS.heicMimes]
  const extensions = [...IMPORT_FORMATS.extensions, ...IMPORT_FORMATS.heicExtensions]
  return [...mimes, ...extensions.map((ext) => `.${ext}`)].join(',')
}

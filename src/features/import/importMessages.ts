import { pageCountLabel } from '../../domain/format'

export interface ImportFailure {
  name: string
  reason: string
}

export interface ImportResult {
  added: number
  failures: ImportFailure[]
}

const MAX_NAMES = 3

/** "a, b, c and 2 more" */
export function listNames(names: readonly string[], max = MAX_NAMES): string {
  const shown = names.slice(0, max).join(', ')
  const rest = names.length - max
  return rest > 0 ? `${shown} and ${rest} more` : shown
}

export function rejectedMessage(names: readonly string[]): string {
  const files = names.length === 1 ? 'a file that isn’t' : `${names.length} files that aren’t`
  return `Skipped ${files} a JPEG, PNG, WebP or HEIC image: ${listNames(names)}`
}

export function failureReason(isHeic: boolean): string {
  return isHeic ? 'HEIC isn’t supported in this browser' : 'couldn’t read the image'
}

/** One toast summing up a finished import. */
export function summaryMessage({ added, failures }: ImportResult): string {
  const addedText = `Added ${pageCountLabel(added)}`
  if (failures.length === 0) return addedText
  const details = listNames(failures.map((f) => `${f.name} (${f.reason})`))
  return `${addedText}. Couldn’t import ${failures.length}: ${details}`
}

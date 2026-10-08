import { useCallback } from 'react'
import { importAcceptAttribute } from '../../domain/import'
import { useImportStore } from '../../stores/importStore'

/** Open the system file picker for importable images; `onPick` gets the chosen files. */
export function pickImageFiles(onPick: (files: File[]) => void, multiple = true) {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = multiple
  input.accept = importAcceptAttribute()
  input.addEventListener('change', () => {
    const files = [...(input.files ?? [])]
    if (files.length > 0) onPick(files)
  })
  input.click()
}

/** Returns a function that opens the file picker and imports the chosen images as pages. */
export function useImportPicker(): (bookId: string) => void {
  return useCallback((bookId: string) => {
    pickImageFiles((files) => void useImportStore.getState().importFiles(bookId, files))
  }, [])
}

import { useCallback } from 'react'
import { importAcceptAttribute } from '../../domain/import'
import { useImportStore } from '../../stores/importStore'

/** Returns a function that opens the system file picker and imports the chosen images. */
export function useImportPicker(): (bookId: string) => void {
  return useCallback((bookId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = importAcceptAttribute()
    input.addEventListener('change', () => {
      const files = [...(input.files ?? [])]
      if (files.length > 0) void useImportStore.getState().importFiles(bookId, files)
    })
    input.click()
  }, [])
}

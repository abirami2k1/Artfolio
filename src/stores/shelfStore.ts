import { create } from 'zustand'

const SELECTED_KEY = 'folio:selectedBookId'

// The selected book is a per-browser convenience: losing it is harmless, so storage errors are ignored.
function readSelected(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY)
  } catch {
    return null
  }
}

function writeSelected(id: string | null) {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id)
    else localStorage.removeItem(SELECTED_KEY)
  } catch {
    // ignore
  }
}

interface ShelfState {
  selectedBookId: string | null
  select(id: string | null): void
}

export const useShelfStore = create<ShelfState>()((set) => ({
  selectedBookId: readSelected(),
  select(id) {
    writeSelected(id)
    set({ selectedBookId: id })
  },
}))

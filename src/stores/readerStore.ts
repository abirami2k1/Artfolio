import { create } from 'zustand'

const LAST_PAGES_KEY = 'folio:lastPages'

// Where each book was left open is a per-browser convenience: storage errors are ignored.
function readLastPages(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LAST_PAGES_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
  } catch {
    return {}
  }
}

function writeLastPages(lastPages: Record<string, string>) {
  try {
    localStorage.setItem(LAST_PAGES_KEY, JSON.stringify(lastPages))
  } catch {
    // ignore
  }
}

interface ReaderState {
  /** Book id → key of the page the reader was on (a render-page key, stable across modes). */
  lastPages: Record<string, string>
  remember(bookId: string, pageKey: string): void
}

export const useReaderStore = create<ReaderState>()((set, get) => ({
  lastPages: readLastPages(),
  remember(bookId, pageKey) {
    if (get().lastPages[bookId] === pageKey) return
    const lastPages = { ...get().lastPages, [bookId]: pageKey }
    writeLastPages(lastPages)
    set({ lastPages })
  },
}))

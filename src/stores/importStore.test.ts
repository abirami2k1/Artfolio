import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBook } from '../domain/book'
import type { Page } from '../domain/types'
import { MemoryRepository } from '../storage/memory/MemoryRepository'
import type { ProcessedImage } from '../workers/processImage'
import { createImportStore, type ImportDeps } from './importStore'
import { useToastStore } from './toastStore'

let repo: MemoryRepository
let deps: ImportDeps

const BOOK_ID = 'b1'
const file = (name: string, type = 'image/png') => new File([name], name, { type })
const processed = (): ProcessedImage => ({
  width: 40,
  height: 30,
  display: new Blob(['d'], { type: 'image/webp' }),
  thumb: new Blob(['t'], { type: 'image/webp' }),
})

async function storedPages(): Promise<Page[]> {
  return (await repo.getBook(BOOK_ID))!.pages
}
async function sourceNames() {
  const pages = await storedPages()
  return Promise.all(pages.map(async (p) => (await repo.getImage(p.imageId!))!.sourceName))
}
const toasts = () => useToastStore.getState().toasts

beforeEach(async () => {
  repo = new MemoryRepository()
  await repo.saveBook(createBook({ title: 'Moths' }, { id: BOOK_ID }))
  deps = {
    repo,
    process: vi.fn(async () => processed()),
    appendPages: async (bookId, pages) => {
      const book = (await repo.getBook(bookId))!
      await repo.saveBook({ ...book, pages: [...book.pages, ...pages] })
    },
  }
  useToastStore.setState({ toasts: [] })
})

describe('importStore', () => {
  it('adds pages in natural filename order', async () => {
    const store = createImportStore(deps)
    const result = await store
      .getState()
      .importFiles(BOOK_ID, [file('10.png'), file('2.png'), file('1.png')])
    expect(result).toEqual({ added: 3, failures: [] })
    expect(await sourceNames()).toEqual(['1.png', '2.png', '10.png'])
    expect(toasts().map((t) => [t.message, t.tone])).toEqual([['Added 3 pages', 'success']])
    expect(store.getState().progress).toBeNull()
  })

  it('rejects non-images with a toast and imports the rest', async () => {
    const store = createImportStore(deps)
    await store.getState().importFiles(BOOK_ID, [file('a.png'), file('notes.txt', 'text/plain')])
    expect(await storedPages()).toHaveLength(1)
    expect(toasts()[0]).toMatchObject({
      tone: 'error',
      message: expect.stringContaining('notes.txt'),
    })
    expect(deps.process).toHaveBeenCalledOnce()
  })

  it('does nothing when every file is rejected', async () => {
    const store = createImportStore(deps)
    expect(
      await store.getState().importFiles(BOOK_ID, [file('x.pdf', 'application/pdf')]),
    ).toBeNull()
    expect(toasts()).toHaveLength(1)
  })

  it('one corrupt file does not stop the batch; the summary lists it', async () => {
    vi.mocked(deps.process).mockImplementation(async (blob) => {
      if ((blob as File).name === '2.png') throw new Error('decode failed')
      return processed()
    })
    const store = createImportStore(deps)
    const result = await store
      .getState()
      .importFiles(BOOK_ID, [file('1.png'), file('2.png'), file('3.png')])
    expect(result).toEqual({
      added: 2,
      failures: [{ name: '2.png', reason: 'couldn’t read the image' }],
    })
    expect(await sourceNames()).toEqual(['1.png', '3.png'])
    expect(toasts()[0].message).toBe(
      'Added 2 pages. Couldn’t import 1: 2.png (couldn’t read the image)',
    )
  })

  it('explains an undecodable HEIC instead of crashing', async () => {
    vi.mocked(deps.process).mockRejectedValue(new Error('unsupported'))
    const store = createImportStore(deps)
    const result = await store.getState().importFiles(BOOK_ID, [file('IMG_1.HEIC', '')])
    expect(result?.failures).toEqual([
      { name: 'IMG_1.HEIC', reason: 'HEIC isn’t supported in this browser' },
    ])
    expect(toasts()[0].tone).toBe('error')
  })

  it('removes the stored image when its page cannot be added', async () => {
    const store = createImportStore({
      ...deps,
      appendPages: () => Promise.reject(new Error('disk full')),
    })
    const result = await store.getState().importFiles(BOOK_ID, [file('a.png')])
    expect(result?.failures).toEqual([{ name: 'a.png', reason: 'couldn’t save it' }])
    expect(repo.images.size).toBe(0)
    expect(repo.blobs.size).toBe(0)
  })

  it('reports progress per file and refuses a second import while running', async () => {
    let release!: () => void
    vi.mocked(deps.process).mockImplementationOnce(async () => {
      await new Promise<void>((r) => (release = r))
      return processed()
    })
    const store = createImportStore(deps)
    const running = store.getState().importFiles(BOOK_ID, [file('a.png'), file('b.png')])
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    expect(store.getState().progress).toEqual({
      bookId: BOOK_ID,
      total: 2,
      done: 0,
      current: 'a.png',
    })
    expect(await store.getState().importFiles(BOOK_ID, [file('c.png')])).toBeNull()
    release()
    await running
    expect(await storedPages()).toHaveLength(2)
    expect(store.getState().progress).toBeNull()
  })

  it('importImage stores one image without adding a page', async () => {
    const store = createImportStore(deps)
    const asset = await store.getState().importImage(BOOK_ID, file('new.png'))
    expect(asset?.sourceName).toBe('new.png')
    expect(await storedPages()).toHaveLength(0)
    expect(await store.getState().importImage(BOOK_ID, file('a.txt', 'text/plain'))).toBeNull()
    vi.mocked(deps.process).mockRejectedValueOnce(new Error('bad'))
    expect(await store.getState().importImage(BOOK_ID, file('b.png'))).toBeNull()
    expect(toasts().map((t) => t.message)).toEqual([
      expect.stringContaining('a.txt'),
      'Couldn’t use b.png: couldn’t read the image',
    ])
  })
})

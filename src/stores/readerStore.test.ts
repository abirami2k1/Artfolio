import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('readerStore', () => {
  it('remembers the last page per book across reloads', async () => {
    const { useReaderStore } = await import('./readerStore')
    useReaderStore.getState().remember('b1', 'p7')
    useReaderStore.getState().remember('b2', 'front-cover')
    vi.resetModules()
    const reloaded = (await import('./readerStore')).useReaderStore
    expect(reloaded.getState().lastPages).toEqual({ b1: 'p7', b2: 'front-cover' })
  })

  it('ignores corrupt stored data', async () => {
    localStorage.setItem('folio:lastPages', '{"b1": 3, "b2": "ok"')
    const { useReaderStore } = await import('./readerStore')
    expect(useReaderStore.getState().lastPages).toEqual({})
    localStorage.setItem('folio:lastPages', '{"b1": 3, "b2": "ok"}')
    vi.resetModules()
    const again = (await import('./readerStore')).useReaderStore
    expect(again.getState().lastPages).toEqual({ b2: 'ok' })
  })
})

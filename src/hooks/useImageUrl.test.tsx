import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookRepository } from '../storage'
import { useImageUrl } from './useImageUrl'

let created: string[]
let revoked: string[]

beforeEach(() => {
  created = []
  revoked = []
  let n = 0
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:test/${++n}`
      created.push(url)
      return url
    }),
    revokeObjectURL: vi.fn((url: string) => revoked.push(url)),
  })
})

afterEach(() => vi.unstubAllGlobals())

function fakeRepo(blobs: Record<string, Blob | null>): BookRepository {
  return {
    getImageBlob: vi.fn(async (id: string, variant: string) => blobs[`${id}:${variant}`] ?? null),
  } as unknown as BookRepository
}

const blob = new Blob(['x'], { type: 'image/webp' })

describe('useImageUrl', () => {
  it('returns an object URL for a stored image and revokes it on unmount', async () => {
    const repo = fakeRepo({ 'img1:thumb': blob })
    const { result, unmount } = renderHook(() => useImageUrl('img1', 'thumb', repo))
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe('blob:test/1'))
    unmount()
    expect(revoked).toEqual(['blob:test/1'])
  })

  it('revokes the old URL when the image changes', async () => {
    const repo = fakeRepo({ 'a:display': blob, 'b:display': blob })
    const { result, rerender, unmount } = renderHook(({ id }) => useImageUrl(id, 'display', repo), {
      initialProps: { id: 'a' },
    })
    await waitFor(() => expect(result.current).toBe('blob:test/1'))
    rerender({ id: 'b' })
    expect(revoked).toEqual(['blob:test/1'])
    await waitFor(() => expect(result.current).toBe('blob:test/2'))
    unmount()
    expect(revoked).toEqual(['blob:test/1', 'blob:test/2'])
  })

  it('returns null and creates nothing for a missing image or no id', async () => {
    const repo = fakeRepo({})
    const missing = renderHook(() => useImageUrl('nope', 'thumb', repo))
    const none = renderHook(() => useImageUrl(undefined, 'thumb', repo))
    await waitFor(() => expect(repo.getImageBlob).toHaveBeenCalledOnce())
    expect(missing.result.current).toBeNull()
    expect(none.result.current).toBeNull()
    expect(created).toEqual([])
  })

  it('does not leak a URL when unmounted before the blob loads', async () => {
    let release!: (b: Blob) => void
    const repo = {
      getImageBlob: () => new Promise<Blob>((resolve) => (release = resolve)),
    } as unknown as BookRepository
    const { unmount } = renderHook(() => useImageUrl('slow', 'display', repo))
    unmount()
    release(blob)
    await Promise.resolve()
    expect(created).toEqual([])
  })
})

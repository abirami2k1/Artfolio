import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRepository } from '../storage/memory/MemoryRepository'
import { useImageAsset } from './useImageAsset'

async function repoWithImage() {
  const repo = new MemoryRepository()
  const blob = new Blob(['x'], { type: 'image/webp' })
  const asset = await repo.putImage({
    id: 'img1',
    bookId: 'b1',
    sourceName: '1.png',
    width: 40,
    height: 30,
    display: blob,
    thumb: blob,
  })
  return { repo, asset }
}

describe('useImageAsset', () => {
  it('loads a stored image’s metadata', async () => {
    const { repo, asset } = await repoWithImage()
    const { result } = renderHook(() => useImageAsset('img1', repo))
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toEqual(asset))
  })

  it('returns null for no id, a missing image, and never a stale image', async () => {
    const { repo } = await repoWithImage()
    const { result, rerender } = renderHook(({ id }) => useImageAsset(id, repo), {
      initialProps: { id: 'img1' as string | undefined },
    })
    await waitFor(() => expect(result.current?.id).toBe('img1'))
    rerender({ id: 'missing' })
    expect(result.current).toBeNull()
    rerender({ id: undefined })
    expect(result.current).toBeNull()
  })
})

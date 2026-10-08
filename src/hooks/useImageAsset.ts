import { useEffect, useState } from 'react'
import type { ImageAsset } from '../domain/types'
import { repository, type BookRepository } from '../storage'

/** Metadata (size, name) of a stored image, or null while loading / when missing. */
export function useImageAsset(
  imageId: string | undefined,
  repo: BookRepository = repository,
): ImageAsset | null {
  const [asset, setAsset] = useState<ImageAsset | null>(null)

  useEffect(() => {
    if (!imageId) return
    let cancelled = false
    repo
      .getImage(imageId)
      .then((found) => !cancelled && setAsset(found))
      .catch(() => !cancelled && setAsset(null))
    return () => {
      cancelled = true
    }
  }, [imageId, repo])

  return asset?.id === imageId ? asset : null
}

import { useEffect, useState } from 'react'
import { repository, type BookRepository, type ImageVariant } from '../storage'

/**
 * Object URL for a stored image, or null while loading / when missing. The only place blob
 * URLs are created; each one is revoked when the image changes or the component unmounts.
 */
export function useImageUrl(
  imageId: string | undefined,
  variant: ImageVariant,
  repo: BookRepository = repository,
): string | null {
  const key = imageId ? `${imageId}:${variant}` : null
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null)

  useEffect(() => {
    if (!imageId || !key) return
    let cancelled = false
    let url: string | null = null
    repo
      .getImageBlob(imageId, variant)
      .then((blob) => {
        if (cancelled || !blob) return
        url = URL.createObjectURL(blob)
        setLoaded({ key, url })
      })
      .catch(() => {
        // Missing or unreadable image: stay null; the renderer shows the page background.
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [imageId, variant, key, repo])

  return loaded?.key === key ? loaded.url : null
}

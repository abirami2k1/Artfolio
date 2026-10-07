import { IMAGE_LIMITS } from '../domain/config'
import { resizePlan } from '../domain/image'
import type { Size } from '../domain/types'

export interface ProcessedImage {
  /** Size of the stored display image. */
  width: number
  height: number
  display: Blob
  thumb: Blob
}

interface DecodedImage extends Size {
  source: CanvasImageSource
  close(): void
}

/** Decoding and drawing differ between a worker (OffscreenCanvas) and the main thread (DOM canvas). */
export interface CanvasBackend {
  decode(file: Blob): Promise<DecodedImage>
  render(source: CanvasImageSource, size: Size): Promise<Blob>
}

/** Decode once, then draw and encode the display image and thumbnail. */
export async function resizeImage(file: Blob, backend: CanvasBackend): Promise<ProcessedImage> {
  const decoded = await backend.decode(file)
  try {
    const plan = resizePlan(decoded)
    const display = await backend.render(decoded.source, plan.display)
    const thumb = await backend.render(decoded.source, plan.thumb)
    return { ...plan.display, display, thumb }
  } finally {
    decoded.close()
  }
}

async function decodeBitmap(file: Blob): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() }
}

function prepare(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null) {
  if (!ctx) throw new Error('Canvas 2D is not available')
  ctx.imageSmoothingQuality = 'high'
  return ctx
}

/** Used inside the image worker. */
export const offscreenBackend: CanvasBackend = {
  decode: decodeBitmap,
  async render(source, { width, height }) {
    const canvas = new OffscreenCanvas(width, height)
    prepare(canvas.getContext('2d')).drawImage(source, 0, 0, width, height)
    return canvas.convertToBlob({ type: IMAGE_LIMITS.mime, quality: IMAGE_LIMITS.quality })
  },
}

async function decodeWithImageElement(file: Blob): Promise<DecodedImage> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { width: img.naturalWidth, height: img.naturalHeight, source: img, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Main-thread fallback when workers or OffscreenCanvas aren't available. */
export const domBackend: CanvasBackend = {
  decode: (file) =>
    typeof createImageBitmap === 'function' ? decodeBitmap(file) : decodeWithImageElement(file),
  render(source, { width, height }) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    prepare(canvas.getContext('2d')).drawImage(source, 0, 0, width, height)
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
        IMAGE_LIMITS.mime,
        IMAGE_LIMITS.quality,
      ),
    )
  },
}

import { describe, expect, it, vi } from 'vitest'
import { IMAGE_LIMITS } from '../domain/config'
import type { Size } from '../domain/types'
import { chooseProcessingPath } from './processImage'
import { resizeImage, type CanvasBackend } from './resize'

function fakeBackend(original: Size, failRender = false) {
  const close = vi.fn()
  const renders: Size[] = []
  const backend: CanvasBackend = {
    decode: async () => ({ ...original, source: {} as CanvasImageSource, close }),
    render: async (_source, size) => {
      if (failRender) throw new Error('encode failed')
      renders.push(size)
      return new Blob([`${size.width}x${size.height}`], { type: IMAGE_LIMITS.mime })
    },
  }
  return { backend, close, renders }
}

describe('resizeImage', () => {
  it('renders a display image and a thumbnail within the limits', async () => {
    const { backend, renders } = fakeBackend({ width: 4800, height: 3200 })
    const result = await resizeImage(new Blob(), backend)
    expect(renders).toEqual([
      { width: 2400, height: 1600 },
      { width: 320, height: 213 },
    ])
    expect(result).toMatchObject({ width: 2400, height: 1600 })
    expect(await result.display.text()).toBe('2400x1600')
    expect(await result.thumb.text()).toBe('320x213')
  })

  it('does not upscale small images', async () => {
    const { backend, renders } = fakeBackend({ width: 150, height: 300 })
    const result = await resizeImage(new Blob(), backend)
    expect(renders).toEqual([
      { width: 150, height: 300 },
      { width: 150, height: 300 },
    ])
    expect(result).toMatchObject({ width: 150, height: 300 })
  })

  it('always releases the decoded image, even when encoding fails', async () => {
    const ok = fakeBackend({ width: 10, height: 10 })
    await resizeImage(new Blob(), ok.backend)
    expect(ok.close).toHaveBeenCalledOnce()

    const failing = fakeBackend({ width: 10, height: 10 }, true)
    await expect(resizeImage(new Blob(), failing.backend)).rejects.toThrow('encode failed')
    expect(failing.close).toHaveBeenCalledOnce()
  })
})

describe('chooseProcessingPath', () => {
  const fn = () => {}

  it('uses the worker when Worker, OffscreenCanvas and createImageBitmap exist', () => {
    expect(chooseProcessingPath({ Worker: fn, OffscreenCanvas: fn, createImageBitmap: fn })).toBe(
      'worker',
    )
  })

  it.each([
    ['no OffscreenCanvas', { Worker: fn, createImageBitmap: fn }],
    ['no Worker', { OffscreenCanvas: fn, createImageBitmap: fn }],
    ['no createImageBitmap', { Worker: fn, OffscreenCanvas: fn }],
  ])('falls back to the main thread with %s', (_label, env) => {
    expect(chooseProcessingPath(env)).toBe('main-thread')
  })
})

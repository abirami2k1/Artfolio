import type { ImageWorkerRequest, ImageWorkerResponse } from './image.worker'
import { domBackend, resizeImage, type ProcessedImage } from './resize'

export type { ProcessedImage } from './resize'

interface Pending {
  file: Blob
  resolve: (result: ProcessedImage) => void
  reject: (error: Error) => void
}

export type ProcessingPath = 'worker' | 'main-thread'

/** Prefer a worker with OffscreenCanvas; fall back to the main thread otherwise. */
export function chooseProcessingPath(env: object = globalThis): ProcessingPath {
  const supported = 'Worker' in env && 'OffscreenCanvas' in env && 'createImageBitmap' in env
  return supported ? 'worker' : 'main-thread'
}

let worker: Worker | null = null
let workerBroken = false
let nextId = 1
const pending = new Map<number, Pending>()

function settle({ data }: MessageEvent<ImageWorkerResponse>) {
  const job = pending.get(data.id)
  if (!job) return
  pending.delete(data.id)
  if (data.ok) job.resolve(data.result)
  else job.reject(new Error(data.error))
}

/** If the worker itself fails (e.g. can't start), finish its jobs on the main thread. */
function failOver() {
  workerBroken = true
  worker?.terminate()
  worker = null
  for (const [id, job] of pending) {
    pending.delete(id)
    resizeImage(job.file, domBackend).then(job.resolve, job.reject)
  }
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = settle
    worker.onerror = failOver
  }
  return worker
}

/** Downscale an image file into a display image and a thumbnail (WebP where supported). */
export function processImage(file: Blob): Promise<ProcessedImage> {
  if (workerBroken || chooseProcessingPath() === 'main-thread') {
    return resizeImage(file, domBackend)
  }
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { file, resolve, reject })
    getWorker().postMessage({ id, file } satisfies ImageWorkerRequest)
  })
}

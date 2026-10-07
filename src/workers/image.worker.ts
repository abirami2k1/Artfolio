import { offscreenBackend, resizeImage, type ProcessedImage } from './resize'

export interface ImageWorkerRequest {
  id: number
  file: Blob
}

export type ImageWorkerResponse =
  { id: number; ok: true; result: ProcessedImage } | { id: number; ok: false; error: string }

// The app's TS config uses DOM types; describe just the worker scope we use.
interface WorkerScope {
  onmessage: ((event: MessageEvent<ImageWorkerRequest>) => void) | null
  postMessage(message: ImageWorkerResponse): void
}

const scope = self as unknown as WorkerScope

scope.onmessage = async ({ data: { id, file } }) => {
  try {
    scope.postMessage({ id, ok: true, result: await resizeImage(file, offscreenBackend) })
  } catch (error) {
    scope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

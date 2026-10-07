export interface StorageUsage {
  usageBytes: number
  quotaBytes: number
}

let persistRequest: Promise<boolean> | null = null

/**
 * Ask the browser not to evict Folio's data under storage pressure. Runs at most once per
 * session (Firefox may show a prompt); later calls return the first answer.
 */
export function requestPersistentStorage(): Promise<boolean> {
  persistRequest ??= (async () => {
    const storage = navigator.storage
    if (!storage?.persist) return false
    try {
      return (await storage.persisted()) || (await storage.persist())
    } catch {
      return false
    }
  })()
  return persistRequest
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

/** Bytes used and available for this origin, or null when the browser can't tell. */
export async function getStorageUsage(): Promise<StorageUsage | null> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    if (!estimate) return null
    return { usageBytes: estimate.usage ?? 0, quotaBytes: estimate.quota ?? 0 }
  } catch {
    return null
  }
}

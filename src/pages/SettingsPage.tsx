import { useEffect, useState } from 'react'
import { formatBytes } from '../domain/format'
import {
  getStorageUsage,
  isStoragePersisted,
  requestPersistentStorage,
  type StorageUsage,
} from '../storage/persistence'

function SettingsPage() {
  const [usage, setUsage] = useState<StorageUsage | null | undefined>(undefined)
  const [persisted, setPersisted] = useState<boolean | undefined>(undefined)

  function readStatus() {
    return Promise.all([getStorageUsage(), isStoragePersisted()])
  }

  useEffect(() => {
    let cancelled = false
    void readStatus().then(([nextUsage, nextPersisted]) => {
      if (cancelled) return
      setUsage(nextUsage)
      setPersisted(nextPersisted)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function askToPersist() {
    await requestPersistentStorage()
    const [nextUsage, nextPersisted] = await readStatus()
    setUsage(nextUsage)
    setPersisted(nextPersisted)
  }

  const share = usage && usage.quotaBytes > 0 ? usage.usageBytes / usage.quotaBytes : 0

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <h1 className="font-display text-4xl">Settings</h1>

      <section className="mt-8 rounded-2xl bg-paper p-6 shadow-sm">
        <h2 className="font-display text-xl">Storage on this device</h2>
        {usage === undefined && <p className="mt-3 text-sm text-muted">Checking…</p>}
        {usage === null && (
          <p className="mt-3 text-sm text-muted">This browser doesn’t report storage usage.</p>
        )}
        {usage && (
          <>
            <p className="mt-3 text-sm">
              Using <strong>{formatBytes(usage.usageBytes)}</strong> of{' '}
              {formatBytes(usage.quotaBytes)} available
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface"
              role="meter"
              aria-label="Storage used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(share * 100, 1)}%` }}
              />
            </div>
          </>
        )}

        <h3 className="mt-6 text-sm font-medium">Persistent storage</h3>
        {persisted === undefined ? (
          <p className="mt-1 text-sm text-muted">Checking…</p>
        ) : persisted ? (
          <p className="mt-1 text-sm text-muted">
            On — your browser won’t clear Folio’s books on its own.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Off — the browser may clear Folio’s books if the device runs low on space.
            </p>
            <button
              type="button"
              onClick={() => void askToPersist()}
              className="mt-3 rounded-full bg-ink px-4 py-2 text-sm text-paper"
            >
              Keep my books
            </button>
          </>
        )}
      </section>
    </div>
  )
}

export default SettingsPage

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Persistence = typeof import('./persistence')

function stubStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

async function freshModule(): Promise<Persistence> {
  vi.resetModules()
  return import('./persistence')
}

describe('storage persistence', () => {
  beforeEach(() => stubStorage(undefined))
  afterEach(() => stubStorage(undefined))

  it('requests persistence only once per session', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist })
    const { requestPersistentStorage } = await freshModule()
    expect(await requestPersistentStorage()).toBe(true)
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('skips the request when already persisted', async () => {
    const persist = vi.fn()
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist })
    const { requestPersistentStorage } = await freshModule()
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('reports false when the browser has no storage manager or refuses', async () => {
    let mod = await freshModule()
    expect(await mod.requestPersistentStorage()).toBe(false)
    expect(await mod.isStoragePersisted()).toBe(false)

    stubStorage({ persisted: vi.fn().mockRejectedValue(new Error('nope')), persist: vi.fn() })
    mod = await freshModule()
    expect(await mod.requestPersistentStorage()).toBe(false)
  })

  it('reads usage and quota', async () => {
    stubStorage({ estimate: vi.fn().mockResolvedValue({ usage: 1234, quota: 10_000 }) })
    const { getStorageUsage } = await freshModule()
    expect(await getStorageUsage()).toEqual({ usageBytes: 1234, quotaBytes: 10_000 })
  })

  it('returns null usage when unavailable', async () => {
    const { getStorageUsage } = await freshModule()
    expect(await getStorageUsage()).toBeNull()
  })
})

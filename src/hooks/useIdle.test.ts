import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIdle } from './useIdle'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useIdle', () => {
  it('goes idle after the delay and wakes on activity', () => {
    const { result } = renderHook(() => useIdle(1000))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toBe(true)
    act(() => {
      window.dispatchEvent(new Event('pointermove'))
    })
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(999))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })
})

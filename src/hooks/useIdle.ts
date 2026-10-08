import { useEffect, useState } from 'react'

const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/** True after `ms` without pointer, touch, wheel or key activity; false again on activity. */
export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), ms)
    const onActivity = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), ms)
    }
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity)
    }
  }, [ms])

  return idle
}

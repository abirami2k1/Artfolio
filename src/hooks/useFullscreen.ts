import { useCallback, useEffect, useState } from 'react'

/** Fullscreen for the whole page; `supported` is false where the browser can't (e.g. iPhone). */
export function useFullscreen() {
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const [active, setActive] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen()
    request.catch(() => {
      // Refused (e.g. not triggered by a user gesture): stay as we are.
    })
  }, [])

  return { supported, active, toggle }
}

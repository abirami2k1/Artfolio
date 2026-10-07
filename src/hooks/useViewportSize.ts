import { useEffect, useState } from 'react'
import type { Size } from '../domain/types'

function read(): Size {
  return { width: window.innerWidth, height: window.innerHeight }
}

/** Window size in CSS px, updated on resize and rotation. */
export function useViewportSize(): Size {
  const [size, setSize] = useState(read)
  useEffect(() => {
    const onResize = () => setSize(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

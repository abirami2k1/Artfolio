import { useGesture } from '@use-gesture/react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useEffect, useRef } from 'react'
import OpenSpread from '../../components/OpenSpread'
import { STACK_SETTINGS, ZOOM_SETTINGS } from '../../domain/config'
import { computeBookSize } from '../../domain/shape'
import { spreadSize } from '../../domain/stack'
import type { Book, Spread, ViewMode } from '../../domain/types'
import { clampZoomPan, clampZoomScale, pinchClosesZoom } from '../../domain/zoom'
import { useViewportSize } from '../../hooks/useViewportSize'

interface ZoomViewProps {
  spread: Spread
  book: Book
  mode: ViewMode
  onClose(): void
}

const SPRING = { type: 'spring' as const, ...STACK_SETTINGS.spring }

/** The current spread lying flat and filling the screen, with pinch/wheel zoom and pan. */
function ZoomView({ spread, book, mode, onClose }: ZoomViewProps) {
  const viewport = useViewportSize()
  const pageSize = computeBookSize(viewport, { ...book, displaySize: 'fit' }, mode)
  const content = spreadSize(pageSize, mode)
  const ref = useRef<HTMLDivElement>(null)
  const scale = useMotionValue(1)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const flat = useMotionValue(0)

  function panTo(px: number, py: number, s = scale.get()) {
    const pan = clampZoomPan({ x: px, y: py }, s, content, viewport)
    x.set(pan.x)
    y.set(pan.y)
  }

  function settle(target: number) {
    const s = clampZoomScale(target)
    const pan = clampZoomPan({ x: x.get(), y: y.get() }, s, content, viewport)
    void animate(scale, s, SPRING)
    void animate(x, pan.x, SPRING)
    void animate(y, pan.y, SPRING)
  }

  useGesture(
    {
      onDrag: ({ offset: [ox, oy], pinching, cancel }) => {
        if (pinching) return cancel()
        panTo(ox, oy)
      },
      onPinch: ({ offset: [s], last }) => {
        if (!last) return scale.set(s)
        if (pinchClosesZoom(s)) onClose()
        else settle(s)
      },
      onWheel: ({ event, delta: [dx, dy], pinching }) => {
        if (pinching || event.ctrlKey) return // trackpad pinch arrives as ctrl+wheel → onPinch
        panTo(x.get() - dx, y.get() - dy)
      },
    },
    {
      target: ref,
      eventOptions: { passive: false },
      drag: { from: () => [x.get(), y.get()], filterTaps: true },
      pinch: {
        from: () => [scale.get(), 0],
        scaleBounds: { min: ZOOM_SETTINGS.closeBelowScale / 2, max: ZOOM_SETTINGS.maxScale },
      },
    },
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed page"
      className="fixed inset-0 z-[1300] bg-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        ref={ref}
        className="absolute inset-0 flex cursor-grab touch-none select-none items-center justify-center overflow-hidden active:cursor-grabbing"
        onDoubleClick={() => settle(scale.get() > 1.01 ? 1 : ZOOM_SETTINGS.doubleClickScale)}
      >
        <motion.div style={{ x, y, scale }}>
          <OpenSpread spread={spread} book={book} pageSize={pageSize} offset={flat} flat />
        </motion.div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close zoom"
        title="Close (Esc)"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-paper text-xl shadow-md ring-1 ring-ink/10"
      >
        ×
      </button>
    </motion.div>
  )
}

export default ZoomView

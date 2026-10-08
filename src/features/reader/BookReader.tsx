import { useGesture } from '@use-gesture/react'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'
import SpreadStack from '../../components/SpreadStack'
import { readerSurfaceColor } from '../../domain/color'
import { READER_SETTINGS, STACK_SETTINGS } from '../../domain/config'
import { expandToRenderPages } from '../../domain/pages'
import { computeBookSize, viewMode } from '../../domain/shape'
import {
  edgeTapStep,
  groupIntoSpreads,
  settleStackIndex,
  spreadAnchorKey,
  spreadCounterLabel,
  spreadIndexForPage,
  spreadPages,
  spreadSize,
  stackDragPosition,
} from '../../domain/stack'
import type { Book } from '../../domain/types'
import { useFullscreen } from '../../hooks/useFullscreen'
import { useIdle } from '../../hooks/useIdle'
import { isTypingOrModal } from '../../hooks/keyboard'
import { useViewportSize } from '../../hooks/useViewportSize'
import { useReaderStore } from '../../stores/readerStore'
import { useImportPicker } from '../import/useImportPicker'
import PageGrid from './PageGrid'
import ReaderToolbar from './ReaderToolbar'
import ZoomView from './ZoomView'

const TAP_SLOP_PX = 4
const PINCH_TO_ZOOM = 1.08 // a pinch on the stack past this opens the zoom view
const SPRING = { type: 'spring' as const, ...STACK_SETTINGS.spring }
const NAV_BUTTON =
  'flex size-10 items-center justify-center rounded-full bg-paper/90 shadow-sm ring-1 ring-ink/10 transition hover:shadow-md disabled:opacity-30'

/** The reader: a Paper-style spread stack with a grid view, zoom and auto-hiding controls. */
function BookReader({ book }: { book: Book }) {
  const viewport = useViewportSize()
  const mode = viewMode(viewport)
  const pageSize = computeBookSize(viewport, book, mode)
  const spreadWidth = spreadSize(pageSize, mode).width
  const renderPages = useMemo(() => expandToRenderPages(book, mode).pages, [book, mode])
  const spreads = useMemo(() => groupIntoSpreads(renderPages, mode), [renderPages, mode])

  // Where we are is a page key, so the same page stays in view when spreads regroup.
  const [anchorKey, setAnchorKey] = useState(() => useReaderStore.getState().lastPages[book.id])
  const currentIndex = spreadIndexForPage(spreads, anchorKey ?? null)
  const position = useMotionValue(currentIndex)
  const reduceMotion = useReducedMotion() ?? false
  const [view, setView] = useState<'stack' | 'grid'>('stack')
  const [zoomed, setZoomed] = useState(false)
  const idle = useIdle(READER_SETTINGS.idleHideMs)
  const fullscreen = useFullscreen()
  const pickImages = useImportPicker()
  const stackRef = useRef<HTMLDivElement>(null)
  const draggedRef = useRef(false)
  const shownSpreadsRef = useRef(spreads)

  // Spreads regrouped (rotation, resize, edits): snap the stack to the anchored page.
  useEffect(() => {
    if (shownSpreadsRef.current === spreads) return
    shownSpreadsRef.current = spreads
    position.jump(currentIndex)
  }, [spreads, currentIndex, position])

  const goTo = useCallback(
    (index: number, animated = true) => {
      const target = Math.min(Math.max(index, 0), spreads.length - 1)
      const key = spreadAnchorKey(spreads[target])
      setAnchorKey(key)
      useReaderStore.getState().remember(book.id, key)
      if (animated && !reduceMotion) void animate(position, target, SPRING)
      else position.jump(target)
    },
    [spreads, book.id, reduceMotion, position],
  )

  useGesture(
    {
      onDrag: ({ active, movement: [mx], velocity: [vx], direction: [dx] }) => {
        if (Math.abs(mx) > TAP_SLOP_PX) draggedRef.current = true
        if (!draggedRef.current) return
        const p = stackDragPosition(currentIndex, mx, spreadWidth, spreads.length)
        if (active) {
          if (reduceMotion) return
          position.stop()
          position.set(p)
          return
        }
        goTo(settleStackIndex(currentIndex, p, -dx * vx, spreads.length))
      },
      onPinch: ({ offset: [scale], cancel }) => {
        if (scale < PINCH_TO_ZOOM) return
        cancel()
        setZoomed(true)
      },
    },
    {
      target: stackRef,
      eventOptions: { passive: false },
      drag: { axis: 'x', filterTaps: true, pointer: { touch: true } },
    },
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingOrModal(event)) return
      if (view === 'grid') {
        if (event.key === 'Escape') setView('stack')
        return
      }
      const steps: Record<string, number> = {
        ArrowRight: currentIndex + 1,
        PageDown: currentIndex + 1,
        ArrowLeft: currentIndex - 1,
        PageUp: currentIndex - 1,
        Home: 0,
        End: spreads.length - 1,
      }
      if (!(event.key in steps)) return
      event.preventDefault()
      goTo(steps[event.key])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, currentIndex, spreads.length, goTo])

  function onStackClick(event: MouseEvent<HTMLDivElement>) {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const step = edgeTapStep(event.clientX - rect.left, rect.width)
    if (step !== 0) goTo(currentIndex + step)
  }

  function openFromGrid(pageKey: string) {
    goTo(spreadIndexForPage(spreads, pageKey), false)
    setView('stack')
  }

  const current = spreads[currentIndex]
  const counter = spreadCounterLabel(spreads, currentIndex)
  const showControls = !idle || view === 'grid'
  const controlsStyle = `transition-opacity duration-500 ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ backgroundColor: readerSurfaceColor(book.cover.color) }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {view === 'stack' ? (
          <motion.div
            key="stack"
            ref={stackRef}
            className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDownCapture={() => (draggedRef.current = false)}
            onClick={onStackClick}
            onDoubleClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              if (edgeTapStep(event.clientX - rect.left, rect.width) === 0) setZoomed(true)
            }}
            role="region"
            aria-roledescription="book"
            aria-label={`${book.title}, ${counter}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <SpreadStack
              spreads={spreads}
              book={book}
              pageSize={pageSize}
              mode={mode}
              currentIndex={currentIndex}
              position={position}
              reduceMotion={reduceMotion}
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            className="absolute inset-0 overflow-y-auto px-6 pb-16 pt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <PageGrid
              book={book}
              pages={renderPages}
              currentKeys={new Set(current ? spreadPages(current).map((p) => p.key) : [])}
              onSelect={openFromGrid}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`absolute inset-x-0 top-0 z-[1100] ${controlsStyle}`}>
        <ReaderToolbar
          bookId={book.id}
          title={book.title}
          counter={counter}
          view={view}
          onToggleView={() => setView(view === 'stack' ? 'grid' : 'stack')}
          onAddImages={() => pickImages(book.id)}
          fullscreen={fullscreen}
        />
      </div>

      {view === 'stack' && (
        <nav
          aria-label="Pages"
          className={`absolute inset-x-0 bottom-0 z-[1100] flex items-center justify-center gap-4 pb-5 ${controlsStyle}`}
        >
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className={NAV_BUTTON}
          >
            <ChevronLeftIcon />
          </button>
          <span className="min-w-32 text-center text-sm text-muted">
            {book.pages.length === 0 ? 'No pages yet — drop images to add them' : counter}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex >= spreads.length - 1}
            className={NAV_BUTTON}
          >
            <ChevronRightIcon />
          </button>
        </nav>
      )}

      <AnimatePresence>
        {zoomed && current && (
          <ZoomView spread={current} book={book} mode={mode} onClose={() => setZoomed(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default BookReader

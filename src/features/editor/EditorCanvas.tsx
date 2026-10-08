import { useGesture } from '@use-gesture/react'
import { useRef, useState } from 'react'
import PageRenderer from '../../components/PageRenderer'
import { canvasPageSize, moveTransform, wheelZoomScale, zoomTransform } from '../../domain/editor'
import type { Book, Page, PageTransform, Size } from '../../domain/types'
import { useElementSize } from '../../hooks/useElementSize'
import { useImageAsset } from '../../hooks/useImageAsset'
import { editPage } from './editorActions'

const CANVAS_PADDING_PX = 32

interface EditorCanvasProps {
  book: Book
  page: Page
}

const NO_SNAP = { x: false, y: false }

/**
 * The selected page at the book's true ratio, drawn by the shared PageRenderer (a spread
 * shows both pages). Drag to move the image, wheel or pinch to zoom.
 */
function EditorCanvas({ book, page }: EditorCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const box = useElementSize(boxRef)
  const isSpread = page.kind === 'spread'
  const inner = {
    width: box.width - 2 * CANVAS_PADDING_PX,
    height: box.height - 2 * CANVAS_PADDING_PX,
  }
  const pageSize = canvasPageSize(inner, book, isSpread)
  const asset = useImageAsset(page.imageId)
  const [snapped, setSnapped] = useState(NO_SNAP)
  const editable = page.kind !== 'blank' && asset !== null

  function zoomTo(scale: number) {
    if (!asset) return
    editPage(
      page.id,
      (p) => ({ ...p, transform: zoomTransform(p, scale, pageSize, asset) }),
      'zoom',
    )
  }

  useGesture(
    {
      onDrag: ({ movement: [mx, my], memo, first, last, pinching, cancel }) => {
        if (pinching) return cancel()
        if (!asset) return
        const start: PageTransform = first || !memo ? page.transform : memo
        const moved = moveTransform(page, start, { x: mx, y: my }, pageSize, asset)
        editPage(page.id, (p) => ({ ...p, transform: moved.transform }), 'move')
        setSnapped(last ? NO_SNAP : moved.snapped)
        return start
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault()
        zoomTo(wheelZoomScale(page.transform.scale, dy))
      },
      onPinch: ({ offset: [scale] }) => zoomTo(scale),
    },
    {
      target: surfaceRef,
      enabled: editable,
      eventOptions: { passive: false },
      drag: { filterTaps: true },
      pinch: { from: () => [page.transform.scale, 0] },
    },
  )

  const shared = { size: pageSize, page, imageSize: asset, paperColor: book.paperColor }
  const area: Size = { width: pageSize.width * (isSpread ? 2 : 1), height: pageSize.height }

  return (
    <div ref={boxRef} className="relative flex h-full min-h-0 items-center justify-center">
      {pageSize.width > 0 && (
        <div
          ref={surfaceRef}
          role="img"
          aria-label={editable ? 'Page canvas: drag to move the image, scroll to zoom' : 'Page'}
          className={`relative flex shadow-[0_14px_32px_rgba(43,39,36,0.22)] ${editable ? 'cursor-move touch-none' : ''}`}
          style={area}
        >
          {isSpread ? (
            <>
              <PageRenderer {...shared} half="left" />
              <PageRenderer {...shared} half="right" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-ink/15" />
            </>
          ) : (
            <PageRenderer {...shared} />
          )}
          {snapped.x && (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-accent" />
          )}
          {snapped.y && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-accent" />
          )}
        </div>
      )}
    </div>
  )
}

export default EditorCanvas

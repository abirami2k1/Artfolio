import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createPage } from '../domain/book'
import { computeImagePlacement, computeSpreadPlacement } from '../domain/layout'
import type { Page, PageTransform, Size } from '../domain/types'
import PageRenderer from './PageRenderer'

vi.mock('../hooks/useImageUrl', () => ({
  useImageUrl: vi.fn((id: string | undefined, variant: string) =>
    id ? `blob:${id}:${variant}` : null,
  ),
}))

const PAGE: Size = { width: 600, height: 800 }
const WIDE_IMAGE: Size = { width: 2000, height: 1000 }
const PAPER = '#FBF8F2'

function page(overrides: Partial<Page> = {}, transform: Partial<PageTransform> = {}): Page {
  const base = createPage('img', { id: 'p' })
  return { ...base, ...overrides, transform: { ...base.transform, ...transform } }
}

function renderPage(props: Partial<Parameters<typeof PageRenderer>[0]> = {}) {
  return render(
    <PageRenderer size={PAGE} page={page()} imageSize={WIDE_IMAGE} paperColor={PAPER} {...props} />,
  )
}

/** The drawn image box in page coordinates (frame offset + image offset). */
function drawnBox(container: HTMLElement) {
  const frame = container.querySelector<HTMLElement>('[data-testid="page-frame"]')!
  const img = container.querySelector('img')!
  const px = (value: string) => parseFloat(value)
  return {
    left: px(frame.style.left) + px(img.style.left),
    top: px(frame.style.top) + px(img.style.top),
    width: px(img.style.width),
    height: px(img.style.height),
  }
}

describe('PageRenderer', () => {
  it.each(['contain', 'cover', 'stretch'] as const)('%s: draws the domain placement', (fit) => {
    const p = page({ fit, margin: 0.05 })
    const { container } = renderPage({ page: p })
    const expected = computeImagePlacement(PAGE, WIDE_IMAGE, p)
    const box = drawnBox(container)
    expect(box.left).toBeCloseTo(expected.left)
    expect(box.top).toBeCloseTo(expected.top)
    expect(box.width).toBeCloseTo(expected.width)
    expect(box.height).toBeCloseTo(expected.height)
    const frame = screen.getByTestId('page-frame')
    expect(parseFloat(frame.style.left)).toBeCloseTo(expected.frame.left)
    expect(parseFloat(frame.style.width)).toBeCloseTo(expected.frame.width)
  })

  it('sizes the page and uses the paper color unless the page has a background', () => {
    renderPage()
    expect(screen.getByTestId('page')).toHaveStyle({
      width: '600px',
      height: '800px',
      backgroundColor: PAPER,
    })
    renderPage({ page: page({ background: '#112233' }) })
    expect(screen.getAllByTestId('page')[1]).toHaveStyle({ backgroundColor: '#112233' })
  })

  it('rotates the image around its center', () => {
    const { container } = renderPage({ page: page({}, { rotation: 90 }) })
    expect(container.querySelector('img')!.style.transform).toBe('rotate(90deg)')
  })

  it('draws only the background for a blank page or an unknown image size', () => {
    const blank = renderPage({ page: createPage(undefined, { id: 'b' }) })
    expect(blank.container.querySelector('img')).toBeNull()
    const loading = renderPage({ imageSize: null })
    expect(loading.container.querySelector('img')).toBeNull()
  })

  it('spread halves side by side form one seamless image', () => {
    const spread = page({ kind: 'spread', fit: 'cover' }, { x: 0.05 })
    const left = drawnBox(renderPage({ page: spread, half: 'left' }).container)
    const right = drawnBox(renderPage({ page: spread, half: 'right' }).container)
    const expected = computeSpreadPlacement(PAGE, WIDE_IMAGE, spread)
    expect(left.left).toBeCloseTo(expected.left.left)
    // the right half's image is the same box, shifted by one page width
    expect(right.left + PAGE.width).toBeCloseTo(left.left)
    expect(right).toMatchObject({ top: left.top, width: left.width, height: left.height })
  })

  it('thumb variant loads the thumb blob with the same placement', () => {
    const full = renderPage()
    const thumb = renderPage({ variant: 'thumb' })
    expect(full.container.querySelector('img')!.getAttribute('src')).toBe('blob:img:display')
    expect(thumb.container.querySelector('img')!.getAttribute('src')).toBe('blob:img:thumb')
    expect(drawnBox(thumb.container)).toEqual(drawnBox(full.container))
  })
})

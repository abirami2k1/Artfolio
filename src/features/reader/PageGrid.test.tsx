import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createBook, createPage } from '../../domain/book'
import { PAGE_GRID } from '../../domain/config'
import { expandToRenderPages } from '../../domain/pages'
import { repository } from '../../storage'
import PageGrid from './PageGrid'

vi.mock('../../hooks/useImageUrl', () => ({
  useImageUrl: (id: string | undefined, variant: string) => (id ? `blob:${id}:${variant}` : null),
}))

async function setup() {
  const blob = new Blob(['x'], { type: 'image/webp' })
  const image = { bookId: 'g1', width: 40, height: 30, display: blob, thumb: blob }
  await repository.putImage({ ...image, id: 'g-a', sourceName: 'a.png' })
  await repository.putImage({ ...image, id: 'g-b', sourceName: 'b.png' })
  const book = {
    ...createBook({ title: 'Grid', presetId: 'square' }, { id: 'g1' }),
    pages: [
      createPage('g-a', { id: 'p1' }),
      { ...createPage('g-b', { id: 'p2' }), kind: 'spread' as const },
      createPage(undefined, { id: 'p3' }),
    ],
  }
  const pages = expandToRenderPages(book, 'single').pages
  const onSelect = vi.fn()
  const utils = render(
    <PageGrid book={book} pages={pages} currentKeys={new Set(['p1'])} onSelect={onSelect} />,
  )
  return { ...utils, onSelect }
}

describe('PageGrid', () => {
  it('draws covers and every inside page (spread halves included) with thumbs', async () => {
    const { container } = await setup()
    const pages = screen.getAllByTestId('page')
    expect(pages).toHaveLength(4) // image, two spread halves, blank (covers aren't PageRenderer)
    expect(pages[0]).toHaveStyle({
      width: `${PAGE_GRID.thumbWidthPx}px`,
      height: `${PAGE_GRID.thumbWidthPx}px`,
    })
    await waitFor(() =>
      expect(container.querySelectorAll('[data-testid=page] img')).toHaveLength(3),
    )
    const sources = [...container.querySelectorAll('[data-testid=page] img')].map((img) =>
      img.getAttribute('src'),
    )
    expect(sources).toEqual(['blob:g-a:thumb', 'blob:g-b:thumb', 'blob:g-b:thumb'])
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(labels).toEqual(['Cover', 'Page 1', 'Page 2', 'Page 3', 'Page 4', 'Back cover'])
  })

  it('marks the current page and reports the tapped page', async () => {
    const { onSelect } = await setup()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(onSelect).toHaveBeenCalledWith('p2:right')
    await userEvent.click(screen.getByRole('button', { name: 'Back cover' }))
    expect(onSelect).toHaveBeenLastCalledWith('back-cover')
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createBook, createPage } from '../../domain/book'
import { PAGE_GRID } from '../../domain/config'
import { repository } from '../../storage'
import PageGrid from './PageGrid'

vi.mock('../../hooks/useImageUrl', () => ({
  useImageUrl: (id: string | undefined, variant: string) => (id ? `blob:${id}:${variant}` : null),
}))

describe('PageGrid', () => {
  it('draws every inside page (spread halves included) with thumbs via PageRenderer', async () => {
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
    const { container } = render(<PageGrid book={book} />)

    const pages = screen.getAllByTestId('page')
    expect(pages).toHaveLength(4) // image, two spread halves, blank
    expect(pages[0]).toHaveStyle({
      width: `${PAGE_GRID.thumbWidthPx}px`,
      height: `${PAGE_GRID.thumbWidthPx}px`,
    })
    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(3))
    const sources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(sources).toEqual(['blob:g-a:thumb', 'blob:g-b:thumb', 'blob:g-b:thumb'])
  })
})

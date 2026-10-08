import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'
import { createBook } from '../domain/book'
import { repository } from '../storage'
import { routes } from './routes'

const READER = 'Sample book'

beforeAll(async () => {
  for (const id of ['abc', 'sample']) {
    await repository.saveBook(createBook({ title: READER }, { id }))
  }
})

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it.each([
    ['/', 'Your shelf'],
    ['/book/abc', READER],
    ['/book/abc/edit', 'Editor'],
    ['/settings', 'Settings'],
  ])('%s renders the %s page', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('redirects unknown routes to the Shelf', async () => {
    const router = renderAt('/nope/nothing')
    expect(await screen.findByRole('heading', { name: 'Your shelf' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('navigates Reader → Editor → Reader', async () => {
    const user = userEvent.setup()
    renderAt('/book/sample')
    expect(await screen.findByRole('heading', { name: READER })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Edit' }))
    expect(await screen.findByRole('heading', { name: 'Editor' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(await screen.findByRole('heading', { name: READER })).toBeInTheDocument()
  })

  it('the Reader explains a book that doesn’t exist', async () => {
    renderAt('/book/missing')
    expect(await screen.findByText('This book isn’t on your shelf')).toBeInTheDocument()
  })
})

describe('layouts', () => {
  it.each(['/', '/settings'])('%s has the top bar', async (path) => {
    renderAt(path)
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  })

  it.each(['/book/abc', '/book/abc/edit'])(
    '%s is full screen without the top bar',
    async (path) => {
      const { container } = render(
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />,
      )
      await screen.findByRole('heading')
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
      expect(container.querySelector('[data-layout="fullscreen"]')).toBeInTheDocument()
    },
  )

  it('switches layout when navigating from Shelf to Reader', async () => {
    const router = renderAt('/')
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    await act(() => router.navigate('/book/abc'))
    await screen.findByRole('heading', { name: READER })
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })
})

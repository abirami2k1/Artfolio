import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it.each([
    ['/', 'Shelf'],
    ['/book/abc', 'Reader'],
    ['/book/abc/edit', 'Editor'],
    ['/settings', 'Settings'],
  ])('%s renders the %s page', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('redirects unknown routes to the Shelf', async () => {
    const router = renderAt('/nope/nothing')
    expect(await screen.findByRole('heading', { name: 'Shelf' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('navigates Shelf → Reader → Editor → Reader', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('link', { name: 'Open sample book' }))
    expect(await screen.findByRole('heading', { name: 'Reader' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Edit' }))
    expect(await screen.findByRole('heading', { name: 'Editor' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(await screen.findByRole('heading', { name: 'Reader' })).toBeInTheDocument()
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
    const user = userEvent.setup()
    renderAt('/')
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Open sample book' }))
    await screen.findByRole('heading', { name: 'Reader' })
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })
})

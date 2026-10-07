import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../app/routes'
import { repository } from '../storage'
import { useLibraryStore } from '../stores/libraryStore'
import { useShelfStore } from '../stores/shelfStore'

async function clearLibrary() {
  for (const book of await repository.listBooks()) await repository.deleteBook(book.id)
  useLibraryStore.setState({ books: [], status: 'idle' })
  useShelfStore.getState().select(null)
}

/**
 * Buttons inside the carousel sit in a @use-gesture drag area, which (correctly) swallows clicks
 * it can't classify as taps. jsdom's synthetic pointer events lack `buttons`, so press those
 * buttons with a plain click. Tap-vs-drag itself is verified in a real browser.
 */
const press = (element: HTMLElement) => fireEvent.click(element)

function renderShelf() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  render(<RouterProvider router={router} />)
  return router
}

describe('ShelfPage', () => {
  beforeEach(clearLibrary)

  it('shows the empty state and creates the first book', async () => {
    const user = userEvent.setup()
    renderShelf()
    await user.click(await screen.findByRole('button', { name: 'Create your first book' }))
    const dialog = screen.getByRole('dialog', { name: 'New book' })
    await user.type(within(dialog).getByLabelText('Title'), 'Moths')
    await user.click(within(dialog).getByRole('radio', { name: 'Square' }))
    await user.click(within(dialog).getByRole('button', { name: 'Create book' }))

    expect(await screen.findByRole('option', { name: 'Open Moths' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Moths' })).toBeInTheDocument()
    expect(screen.getByText('0 pages')).toBeInTheDocument()
    const [saved] = await repository.listBooks()
    expect(saved).toMatchObject({ title: 'Moths', shape: { presetId: 'square' } })
  })

  it('arrow keys change the selected book and the selection is remembered', async () => {
    await useLibraryStore.getState().createBook({ title: 'First' })
    await useLibraryStore.getState().createBook({ title: 'Second' })
    const user = userEvent.setup()
    renderShelf()
    expect(await screen.findByRole('option', { name: 'Open First' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: 'Open Second' })).toBeInTheDocument()
    const second = useLibraryStore.getState().books[1]
    expect(useShelfStore.getState().selectedBookId).toBe(second.id)
  })

  it('opens the selected book in the reader', async () => {
    const book = (await useLibraryStore.getState().createBook({ title: 'Moths' }))!
    const router = renderShelf()
    press(await screen.findByRole('button', { name: 'Open' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/book/${book.id}`))
  })

  it('deletes a book only after confirming', async () => {
    await useLibraryStore.getState().createBook({ title: 'Moths' })
    const user = userEvent.setup()
    renderShelf()
    press(await screen.findByRole('button', { name: 'More actions' }))
    press(screen.getByRole('menuitem', { name: 'Delete book…' }))
    const confirmDialog = await screen.findByRole('alertdialog', { name: 'Delete “Moths”?' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Cancel' }))
    expect(await repository.listBooks()).toHaveLength(1)

    press(screen.getByRole('button', { name: 'More actions' }))
    press(screen.getByRole('menuitem', { name: 'Delete book…' }))
    await user.click(screen.getByRole('button', { name: 'Delete book' }))
    await waitFor(async () => expect(await repository.listBooks()).toHaveLength(0))
    expect(
      await screen.findByRole('button', { name: 'Create your first book' }),
    ).toBeInTheDocument()
  })

  it('renames a book from the cover settings button', async () => {
    await useLibraryStore.getState().createBook({ title: 'Moths' })
    const user = userEvent.setup()
    renderShelf()
    press(await screen.findByRole('button', { name: 'Book settings' }))
    const dialog = await screen.findByRole('dialog', { name: 'Book settings' })
    const title = within(dialog).getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Night Moths')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('heading', { name: 'Night Moths' })).toBeInTheDocument()
    expect((await repository.listBooks())[0].title).toBe('Night Moths')
  })
})

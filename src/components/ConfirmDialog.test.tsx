import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { confirm, useConfirmStore } from '../stores/confirmStore'
import ConfirmDialog from './ConfirmDialog'

function open() {
  let result!: Promise<boolean>
  act(() => {
    result = confirm({
      title: 'Delete “Moths”?',
      message: 'Gone for good.',
      confirmLabel: 'Delete',
    })
  })
  return result
}

describe('ConfirmDialog', () => {
  beforeEach(() => useConfirmStore.setState({ pending: null }))

  it('renders nothing until asked', () => {
    render(<ConfirmDialog />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('names what it is about and focuses Cancel', () => {
    render(<ConfirmDialog />)
    void open()
    const dialog = screen.getByRole('alertdialog', { name: 'Delete “Moths”?' })
    expect(dialog).toHaveAccessibleDescription('Gone for good.')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('resolves true on confirm and closes', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog />)
    const result = open()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await expect(result).resolves.toBe(true)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('resolves false on Cancel, Escape and backdrop click', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog />)

    let result = open()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await expect(result).resolves.toBe(false)

    result = open()
    await user.keyboard('{Escape}')
    await expect(result).resolves.toBe(false)

    result = open()
    await user.click(screen.getByRole('alertdialog').parentElement!)
    await expect(result).resolves.toBe(false)
  })

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog />)
    void open()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })
})

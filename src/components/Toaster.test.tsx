import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast, useToastStore } from '../stores/toastStore'
import Toaster from './Toaster'

describe('Toaster', () => {
  beforeEach(() => useToastStore.setState({ toasts: [] }))
  afterEach(() => vi.useRealTimers())

  it('shows a toast and dismisses it on click', async () => {
    const user = userEvent.setup()
    render(<Toaster />)
    act(() => {
      toast('Saved', 'success')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('announces errors as alerts', () => {
    render(<Toaster />)
    act(() => {
      toast('Upload failed', 'error')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed')
  })

  it('auto-dismisses after a few seconds', () => {
    vi.useFakeTimers()
    render(<Toaster />)
    act(() => {
      toast('Bye')
    })
    expect(screen.getByText('Bye')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('Bye')).not.toBeInTheDocument()
  })
})

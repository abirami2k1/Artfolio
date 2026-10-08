import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useImportStore } from '../../stores/importStore'
import ImportDropzone from './ImportDropzone'

afterEach(() => vi.restoreAllMocks())

const png = new File(['x'], 'a.png', { type: 'image/png' })
const dataTransfer = (files: File[]) => ({ types: ['Files'], files, dropEffect: 'none' })

describe('ImportDropzone', () => {
  it('shows a hint while dragging files and imports them on drop', () => {
    const importFiles = vi.spyOn(useImportStore.getState(), 'importFiles').mockResolvedValue(null)
    render(
      <ImportDropzone bookId="b1" bookTitle="Moths">
        <p>shelf</p>
      </ImportDropzone>,
    )
    const zone = screen.getByText('shelf').parentElement!
    fireEvent.dragEnter(zone, { dataTransfer: dataTransfer([png]) })
    expect(screen.getByText('Drop to add to “Moths”')).toBeInTheDocument()
    fireEvent.drop(zone, { dataTransfer: dataTransfer([png]) })
    expect(importFiles).toHaveBeenCalledWith('b1', [png])
    expect(screen.queryByText(/Drop to add/)).not.toBeInTheDocument()
  })

  it('ignores drops when there is no book', () => {
    const importFiles = vi.spyOn(useImportStore.getState(), 'importFiles')
    render(
      <ImportDropzone bookId={null}>
        <p>empty</p>
      </ImportDropzone>,
    )
    const zone = screen.getByText('empty').parentElement!
    fireEvent.dragEnter(zone, { dataTransfer: dataTransfer([png]) })
    fireEvent.drop(zone, { dataTransfer: dataTransfer([png]) })
    expect(screen.queryByText(/Drop to add/)).not.toBeInTheDocument()
    expect(importFiles).not.toHaveBeenCalled()
  })
})

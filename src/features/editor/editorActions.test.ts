import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBook, createPage } from '../../domain/book'
import type { Page } from '../../domain/types'
import { repository } from '../../storage'
import { useBookStore } from '../../stores/bookStore'
import * as confirmStore from '../../stores/confirmStore'
import { useToastStore } from '../../stores/toastStore'
import {
  editPage,
  insertBlankPage,
  removePageConfirmed,
  reorderPages,
  toggleSpreadPage,
} from './editorActions'

const image = (id: string): Page => createPage(`img-${id}`, { id })
const ids = () => useBookStore.getState().book!.pages.map((p) => p.id)

beforeEach(async () => {
  await useBookStore.getState().close()
  await repository.saveBook({
    ...createBook({ title: 'Edit me' }, { id: 'ed1' }),
    pages: [image('a'), image('b'), image('c')],
  })
  await useBookStore.getState().open('ed1')
  useToastStore.setState({ toasts: [] })
})

describe('editor actions', () => {
  it('editPage changes one page; same-kind edits undo together', () => {
    editPage('b', (p) => ({ ...p, margin: 0.1 }), 'margin')
    editPage('b', (p) => ({ ...p, margin: 0.2 }), 'margin')
    expect(useBookStore.getState().book!.pages[1].margin).toBe(0.2)
    expect(useBookStore.getState().undoCount).toBe(1)
  })

  it('inserts a blank page after the selected one and selects it', () => {
    insertBlankPage('a')
    const pages = useBookStore.getState().book!.pages
    expect(pages.map((p) => p.kind)).toEqual(['image', 'blank', 'image', 'image'])
    expect(useBookStore.getState().selectedPageId).toBe(pages[1].id)
  })

  it('removes a page only after confirmation, selecting its neighbor', async () => {
    const ask = vi.spyOn(confirmStore, 'confirm').mockResolvedValueOnce(false)
    await removePageConfirmed('b', 2)
    expect(ids()).toEqual(['a', 'b', 'c'])
    ask.mockResolvedValueOnce(true)
    await removePageConfirmed('b', 2)
    expect(ids()).toEqual(['a', 'c'])
    expect(useBookStore.getState().selectedPageId).toBe('c')
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove page 2?' }))
  })

  it('making a spread that would start on a right page adds a filler and says so', () => {
    toggleSpreadPage('a') // first inside page is a left page: no filler
    expect(useToastStore.getState().toasts).toHaveLength(0)
    toggleSpreadPage('a')
    toggleSpreadPage('b') // second inside page is a right page
    expect(useBookStore.getState().book!.pages[1].kind).toBe('spread')
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual([
      'Added a blank page before this spread so it starts on a left page',
    ])
  })

  it('reorders pages', () => {
    reorderPages(0, 2)
    expect(ids()).toEqual(['b', 'c', 'a'])
  })
})

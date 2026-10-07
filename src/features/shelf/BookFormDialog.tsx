import { useId, useState, type FormEvent } from 'react'
import BookCover from '../../components/BookCover'
import Dialog from '../../components/Dialog'
import Segmented from '../../components/Segmented'
import { BOOK_PRESETS, COVER_COLORS, CUSTOM_PRESET_ID } from '../../domain/config'
import { coverGeometry } from '../../domain/shelf'
import type { DisplaySize, Orientation } from '../../domain/types'
import { isFormValid, previewBook, withShape, type BookFormValues } from './bookForm'

const PREVIEW_BOX = { width: 150, height: 150 }

const SHAPE_OPTIONS = [
  ...BOOK_PRESETS.map((p) => ({ value: p.id as string, label: p.label })),
  { value: CUSTOM_PRESET_ID, label: 'Custom ratio' },
]
const ORIENTATION_OPTIONS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
] as const satisfies readonly { value: Orientation; label: string }[]
const DISPLAY_SIZE_OPTIONS = [
  { value: 'fit', label: 'Fit' },
  { value: 'large', label: 'Large' },
  { value: 'medium', label: 'Medium' },
] as const satisfies readonly { value: DisplaySize; label: string }[]

interface BookFormDialogProps {
  title: string
  submitLabel: string
  initialValues: BookFormValues
  pageCount?: number
  onSubmit(values: BookFormValues): Promise<boolean>
  onClose(): void
}

/** Create-book and book-settings form, with a live preview of the closed book. */
function BookFormDialog({
  title,
  submitLabel,
  initialValues,
  pageCount = 0,
  onSubmit,
  onClose,
}: BookFormDialogProps) {
  const [values, setValues] = useState(initialValues)
  const [busy, setBusy] = useState(false)
  const titleId = useId()
  const valid = isFormValid(values)
  const preview = previewBook(values)
  const set = (change: Partial<BookFormValues>) => setValues((v) => ({ ...v, ...change }))
  const setShape = (change: Parameters<typeof withShape>[1]) =>
    setValues((v) => withShape(v, change))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const ok = await onSubmit(values)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Dialog title={title} onClose={onClose} className="max-w-2xl">
      <form onSubmit={submit} className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <div>
            <label htmlFor={titleId} className="mb-2 block text-sm text-muted">
              Title
            </label>
            <input
              id={titleId}
              value={values.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Untitled book"
              maxLength={200}
              className="w-full rounded-lg border border-ink/15 bg-white/60 px-3 py-2 outline-none focus:border-ink"
            />
          </div>
          <Segmented
            label="Page shape"
            value={values.presetId}
            options={SHAPE_OPTIONS}
            onChange={(presetId) => setShape({ presetId })}
          />
          {values.presetId === CUSTOM_PRESET_ID && (
            <div className="flex items-center gap-2 text-sm">
              <label className="sr-only" htmlFor={`${titleId}-w`}>
                Ratio width
              </label>
              <input
                id={`${titleId}-w`}
                type="number"
                min="0.1"
                step="any"
                value={Number.isFinite(values.customW) ? values.customW : ''}
                onChange={(e) => setShape({ customW: e.target.valueAsNumber })}
                className="w-20 rounded-lg border border-ink/15 bg-white/60 px-2 py-1.5"
              />
              <span aria-hidden="true">:</span>
              <label className="sr-only" htmlFor={`${titleId}-h`}>
                Ratio height
              </label>
              <input
                id={`${titleId}-h`}
                type="number"
                min="0.1"
                step="any"
                value={Number.isFinite(values.customH) ? values.customH : ''}
                onChange={(e) => setShape({ customH: e.target.valueAsNumber })}
                className="w-20 rounded-lg border border-ink/15 bg-white/60 px-2 py-1.5"
              />
              {!valid && <span className="text-accent">Enter two positive numbers</span>}
            </div>
          )}
          <Segmented
            label="Orientation"
            value={values.orientation}
            options={ORIENTATION_OPTIONS}
            onChange={(orientation) => set({ orientation })}
          />
          <Segmented
            label="Display size"
            value={values.displaySize}
            options={DISPLAY_SIZE_OPTIONS}
            onChange={(displaySize) => set({ displaySize })}
          />
          <fieldset>
            <legend className="mb-2 text-sm text-muted">Cover color</legend>
            <div className="flex flex-wrap items-center gap-2">
              {COVER_COLORS.map((color) => (
                <label
                  key={color}
                  className="size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-paper has-checked:ring-2 has-checked:ring-ink has-focus-visible:ring-2 has-focus-visible:ring-accent"
                  style={{ backgroundColor: color }}
                >
                  <input
                    type="radio"
                    name={`${titleId}-color`}
                    checked={values.coverColor.toLowerCase() === color.toLowerCase()}
                    onChange={() => set({ coverColor: color })}
                    className="sr-only"
                    aria-label={color}
                  />
                </label>
              ))}
              <label className="relative size-8 cursor-pointer overflow-hidden rounded-full border border-dashed border-ink/30">
                <span className="sr-only">Custom color</span>
                <input
                  type="color"
                  value={values.coverColor.toLowerCase()}
                  onChange={(e) => set({ coverColor: e.target.value.toUpperCase() })}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl bg-surface p-6 sm:w-56">
          {valid ? (
            <BookCover
              book={{
                title: values.title || 'Untitled book',
                cover: { color: values.coverColor, showTitle: true },
                paperColor: '#FBF8F2',
              }}
              geometry={coverGeometry(preview, pageCount, PREVIEW_BOX)}
            />
          ) : (
            <div className="text-sm text-muted">No preview</div>
          )}
          <p className="mt-4 text-xs text-muted">Preview</p>
        </div>

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || busy}
            className="rounded-full bg-ink px-5 py-2 text-sm text-paper disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export default BookFormDialog

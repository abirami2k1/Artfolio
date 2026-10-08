import { useId, type ReactNode } from 'react'
import Segmented from '../../components/Segmented'
import { EDITOR_SETTINGS } from '../../domain/config'
import {
  canvasPageSize,
  quarterTurn,
  resetPage,
  scaleToSlider,
  sliderToScale,
  zoomTransform,
} from '../../domain/editor'
import { clampTransform } from '../../domain/layout'
import type { Book, Fit, Page } from '../../domain/types'
import { useImageAsset } from '../../hooks/useImageAsset'
import { editPage, removePageConfirmed, replaceImage, toggleSpreadPage } from './editorActions'

const FIT_OPTIONS = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'stretch', label: 'Stretch' },
] as const satisfies readonly { value: Fit; label: string }[]

// Clamping happens in page units; any page size with the right aspect gives the same result.
const REFERENCE_BOX = { width: 1000, height: 1000 }

const BUTTON =
  'rounded-full border border-ink/15 px-3 py-1.5 text-sm transition hover:border-ink/40 disabled:opacity-40'

interface PagePanelProps {
  book: Book
  page: Page
  pageNumber: number
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange(value: number): void
}) {
  const id = useId()
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <label htmlFor={id} className="text-muted">
          {label}
        </label>
        <span className="tabular-nums">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-accent"
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-ink/10 pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  )
}

/** Controls for the selected page: fit, zoom, rotation, background, margin and page actions. */
function PagePanel({ book, page, pageNumber }: PagePanelProps) {
  const asset = useImageAsset(page.imageId)
  const pageSize = canvasPageSize(REFERENCE_BOX, book, page.kind === 'spread')
  const hasImage = page.kind !== 'blank'
  const { scale, rotation } = page.transform

  const setRotation = (degrees: number) =>
    editPage(
      page.id,
      (p) => {
        const turned = { ...p, transform: { ...p.transform, rotation: degrees } }
        return asset ? { ...turned, transform: clampTransform(turned, pageSize, asset) } : turned
      },
      'rotate',
    )

  return (
    <div className="space-y-5 p-4">
      {hasImage && (
        <Section title="Image">
          <Segmented
            label="Fit"
            value={page.fit}
            options={FIT_OPTIONS}
            onChange={(fit) => editPage(page.id, (p) => ({ ...p, fit }))}
          />
          <Slider
            label="Zoom"
            value={scaleToSlider(scale)}
            display={`${Math.round(scale * 100)}%`}
            min={0}
            max={1}
            step={0.001}
            onChange={(value) =>
              asset &&
              editPage(
                page.id,
                (p) => ({
                  ...p,
                  transform: zoomTransform(p, sliderToScale(value), pageSize, asset),
                }),
                'zoom',
              )
            }
          />
          <Slider
            label="Rotate"
            value={rotation}
            display={`${Math.round(rotation)}°`}
            min={-180}
            max={179}
            step={1}
            onChange={setRotation}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={BUTTON}
              onClick={() => setRotation(quarterTurn(rotation, -1))}
            >
              ⟲ 90°
            </button>
            <button
              type="button"
              className={BUTTON}
              onClick={() => setRotation(quarterTurn(rotation, 1))}
            >
              ⟳ 90°
            </button>
          </div>
        </Section>
      )}

      <Section title="Page">
        <div className="flex items-center justify-between gap-3 text-sm">
          <label htmlFor={`bg-${page.id}`} className="text-muted">
            Background
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`bg-${page.id}`}
              type="color"
              value={page.background ?? book.paperColor}
              onChange={(event) =>
                editPage(
                  page.id,
                  (p) => ({ ...p, background: event.target.value.toUpperCase() }),
                  'background',
                )
              }
              className="size-8 cursor-pointer rounded border border-ink/15 bg-transparent"
            />
            <button
              type="button"
              className={BUTTON}
              disabled={page.background === null}
              onClick={() => editPage(page.id, (p) => ({ ...p, background: null }))}
            >
              Paper
            </button>
          </div>
        </div>
        <Slider
          label="Margin"
          value={page.margin}
          display={`${Math.round(page.margin * 100)}%`}
          min={0}
          max={EDITOR_SETTINGS.maxMargin}
          step={0.005}
          onChange={(margin) => editPage(page.id, (p) => ({ ...p, margin }), 'margin')}
        />
        <button type="button" className={BUTTON} onClick={() => editPage(page.id, resetPage)}>
          Reset page
        </button>
      </Section>

      <Section title="Arrange">
        <div className="flex flex-wrap gap-2">
          {hasImage && (
            <button type="button" className={BUTTON} onClick={() => toggleSpreadPage(page.id)}>
              {page.kind === 'spread' ? 'Make single page' : 'Spread across two pages'}
            </button>
          )}
          <button type="button" className={BUTTON} onClick={() => replaceImage(book.id, page.id)}>
            {hasImage ? 'Replace image' : 'Add image'}
          </button>
          <button
            type="button"
            className={`${BUTTON} text-accent`}
            onClick={() => void removePageConfirmed(page.id, pageNumber)}
          >
            Remove page
          </button>
        </div>
      </Section>
    </div>
  )
}

export default PagePanel

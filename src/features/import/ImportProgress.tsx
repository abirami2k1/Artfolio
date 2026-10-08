import { useImportStore } from '../../stores/importStore'

/** A small pill while an import runs: "Importing 3 of 12" with a bar. */
function ImportProgress() {
  const progress = useImportStore((s) => s.progress)
  if (!progress) return null
  const { done, total, current } = progress

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-4 z-50 w-72 -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-sm text-paper shadow-lg"
    >
      <p className="flex justify-between gap-3">
        <span>
          Importing {done + 1} of {total}
        </span>
        <span className="truncate text-paper/60">{current}</span>
      </p>
      <progress
        className="mt-2 block h-1 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-paper/20 [&::-webkit-progress-value]:bg-accent"
        max={total}
        value={done}
        aria-label="Import progress"
      />
    </div>
  )
}

export default ImportProgress

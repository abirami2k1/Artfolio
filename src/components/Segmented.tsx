import { useId } from 'react'

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange(value: T): void
}

/** A row of mutually exclusive choices (native radios, so arrow keys work). */
function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-full border border-ink/15 px-3 py-1.5 text-sm transition-colors has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default Segmented

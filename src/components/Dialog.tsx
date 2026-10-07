import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogProps {
  title: string
  description?: string
  onClose(): void
  children: ReactNode
  role?: 'dialog' | 'alertdialog'
  /** Element focused on open; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>
  className?: string
}

/** Modal shell: backdrop click and Esc close it, Tab stays inside, focus returns on close. */
function Dialog({
  title,
  description,
  onClose,
  children,
  role = 'dialog',
  initialFocusRef,
  className = 'max-w-sm',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(initialFocusRef?.current ?? first)?.focus()
    return () => previouslyFocused?.focus()
  }, [initialFocusRef])

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab' || !panelRef.current) return
    const focusables = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (focusables.length === 0) return
    const index = focusables.indexOf(document.activeElement as HTMLElement)
    const next = (index + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length
    event.preventDefault()
    focusables[next].focus()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`max-h-full w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-xl ${className}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="font-display text-xl">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm text-muted">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}

export default Dialog

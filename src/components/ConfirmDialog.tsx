import { useRef } from 'react'
import { useConfirmStore } from '../stores/confirmStore'
import Dialog from './Dialog'

function ConfirmDialog() {
  const pending = useConfirmStore((state) => state.pending)
  const settle = useConfirmStore((state) => state.settle)
  const cancelRef = useRef<HTMLButtonElement>(null)

  if (!pending) return null

  return (
    <Dialog
      role="alertdialog"
      title={pending.title}
      description={pending.message}
      onClose={() => settle(false)}
      initialFocusRef={cancelRef}
    >
      <div className="mt-6 flex justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => settle(false)}
          className="rounded-full px-4 py-2 text-sm hover:bg-surface"
        >
          {pending.cancelLabel ?? 'Cancel'}
        </button>
        <button
          type="button"
          onClick={() => settle(true)}
          className={`rounded-full px-4 py-2 text-sm text-paper ${pending.destructive ? 'bg-accent' : 'bg-ink'}`}
        >
          {pending.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Dialog>
  )
}

export default ConfirmDialog

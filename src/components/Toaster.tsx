import { useToastStore, type ToastTone } from '../stores/toastStore'

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'bg-ink text-paper',
  success: 'bg-ink text-paper',
  error: 'bg-accent text-paper',
}

function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-full px-5 py-2.5 text-sm shadow-lg ${TONE_CLASSES[t.tone]}`}
        >
          <span>{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export default Toaster

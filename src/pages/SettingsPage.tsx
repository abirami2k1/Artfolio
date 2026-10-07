import { confirm } from '../stores/confirmStore'
import { toast } from '../stores/toastStore'

// Demo controls for the toast and confirm dialog; replaced by real settings in Phase 03.
function SettingsPage() {
  async function askDemo() {
    const confirmed = await confirm({
      title: 'Delete “Sample book”?',
      message: 'This removes the book and its images from this browser.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    toast(confirmed ? 'Confirmed' : 'Cancelled', confirmed ? 'success' : 'info')
  }

  return (
    <section>
      <h1 className="font-display text-4xl">Settings</h1>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => toast('Hello from Folio')}
          className="rounded-full bg-ink px-4 py-2 text-sm text-paper"
        >
          Show toast
        </button>
        <button
          type="button"
          onClick={askDemo}
          className="rounded-full bg-accent px-4 py-2 text-sm text-paper"
        >
          Show confirm
        </button>
      </div>
    </section>
  )
}

export default SettingsPage

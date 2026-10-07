import { PlusIcon } from '../../components/icons'

function EmptyShelf({ onCreate }: { onCreate(): void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden="true"
        className="mb-8 h-40 w-28 rotate-[-4deg] rounded-l-[3px] rounded-r-xl border-2 border-dashed border-ink/20"
      />
      <h2 className="font-display text-3xl">Your shelf is empty</h2>
      <p className="mt-2 max-w-sm text-muted">
        Bind your illustrations into a book of any shape, then flip through it page by page.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-paper shadow-md hover:brightness-105"
      >
        <PlusIcon width={18} height={18} />
        Create your first book
      </button>
    </div>
  )
}

export default EmptyShelf

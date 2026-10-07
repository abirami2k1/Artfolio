import { Link, Outlet } from 'react-router'

function ShellLayout() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl">
          Folio
        </Link>
        <nav aria-label="Main">
          <Link to="/settings" className="text-sm text-muted hover:text-ink">
            Settings
          </Link>
        </nav>
      </header>
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default ShellLayout

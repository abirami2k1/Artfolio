import { Link, Outlet } from 'react-router'

function ShellLayout() {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl">
          Folio
        </Link>
        <nav aria-label="Main">
          <Link to="/settings" className="text-sm text-muted hover:text-ink">
            Settings
          </Link>
        </nav>
      </header>
      <main className="px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default ShellLayout

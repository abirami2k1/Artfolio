import { Outlet } from 'react-router'

function FullscreenLayout() {
  return (
    <main className="fixed inset-0 overflow-hidden" data-layout="fullscreen">
      <Outlet />
    </main>
  )
}

export default FullscreenLayout

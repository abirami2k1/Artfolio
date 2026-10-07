import { Outlet } from 'react-router'
import ConfirmDialog from '../components/ConfirmDialog'
import Toaster from '../components/Toaster'

function RootLayout() {
  return (
    <>
      <Outlet />
      <ConfirmDialog />
      <Toaster />
    </>
  )
}

export default RootLayout

import { Outlet } from 'react-router'
import ConfirmDialog from '../components/ConfirmDialog'
import Toaster from '../components/Toaster'
import ImportProgress from '../features/import/ImportProgress'

function RootLayout() {
  return (
    <>
      <Outlet />
      <ConfirmDialog />
      <ImportProgress />
      <Toaster />
    </>
  )
}

export default RootLayout

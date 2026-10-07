import { Navigate, type RouteObject } from 'react-router'
import EditorPage from '../pages/EditorPage'
import ReaderPage from '../pages/ReaderPage'
import SettingsPage from '../pages/SettingsPage'
import ShelfPage from '../pages/ShelfPage'
import FullscreenLayout from './FullscreenLayout'
import RootLayout from './RootLayout'
import ShellLayout from './ShellLayout'

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <ShellLayout />,
        children: [
          { path: '/', element: <ShelfPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
      {
        element: <FullscreenLayout />,
        children: [
          { path: '/book/:id', element: <ReaderPage /> },
          { path: '/book/:id/edit', element: <EditorPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

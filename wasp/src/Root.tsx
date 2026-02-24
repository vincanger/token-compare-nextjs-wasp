import { Outlet } from 'react-router'
import './globals.css'

export function Root() {
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <Outlet />
    </div>
  )
}

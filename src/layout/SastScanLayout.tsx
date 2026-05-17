import { Outlet } from 'react-router-dom'

/** Родитель маршрутов `/app/scan/*` — только вложенные страницы. */
export function SastScanLayout() {
  return <Outlet />
}

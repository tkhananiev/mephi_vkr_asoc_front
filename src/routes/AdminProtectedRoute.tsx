import { Outlet } from 'react-router-dom'
import { jwtPayloadRole } from '../auth/jwtPayload'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { NavigateLoginFresh } from './NavigateLoginFresh'

export function AdminProtectedRoute() {
  const raw = typeof window === 'undefined' ? null : localStorage.getItem(ADMIN_TOKEN_KEY)
  if (!raw) {
    return <NavigateLoginFresh />
  }
  const role = jwtPayloadRole(raw)
  if (role !== 'admin') {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    return <NavigateLoginFresh />
  }
  return <Outlet />
}

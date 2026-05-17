import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { TOKEN_KEY } from '../auth/token'
import { jwtPayloadRole } from '../auth/jwtPayload'
import { NavigateLoginFresh } from './NavigateLoginFresh'

export function ProtectedRoute() {
  const location = useLocation()
  const { token } = useAuth()
  const has = token ?? localStorage.getItem(TOKEN_KEY)
  if (has) {
    const role = jwtPayloadRole(has)
    if (role === 'admin') {
      localStorage.removeItem(TOKEN_KEY)
      return <NavigateLoginFresh state={{ from: window.location.pathname }} />
    }
  }
  if (!has) {
    return <NavigateLoginFresh state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

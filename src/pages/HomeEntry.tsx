import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { TOKEN_KEY } from '../auth/token'
import { jwtPayloadRole } from '../auth/jwtPayload'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { MarketingLanding } from './MarketingLanding'

function redirectIfAuthenticated() {
  const adminRaw = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  if (adminRaw) {
    const r = jwtPayloadRole(adminRaw)
    if (r === 'admin') return <Navigate to="/asoc-admin/dashboard" replace />
  }
  return null
}

/** Корень сайта: маркетинговый лендинг или редирект при уже активной сессии. */
export function HomeEntry() {
  const { token } = useAuth()
  const userRaw = token ?? (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null)

  const adm = redirectIfAuthenticated()
  if (adm) return adm

  if (userRaw) {
    const r = jwtPayloadRole(userRaw)
    if (r !== 'admin') return <Navigate to="/app" replace />
  }
  return <MarketingLanding />
}

/** Совместимость: открывает модальную форму входа на главной. */
export function LoginEntry() {
  const loc = useLocation()

  const { token } = useAuth()
  const userRaw = token ?? (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null)

  const adm = redirectIfAuthenticated()
  if (adm) return adm

  if (userRaw) {
    const r = jwtPayloadRole(userRaw)
    if (r !== 'admin') return <Navigate to="/app" replace />
  }
  return <Navigate to={{ pathname: '/', search: '?auth=login' }} replace state={loc.state} />
}

/** Совместимость: открывает модальную регистрацию на главной. */
export function RegisterEntry() {
  const loc = useLocation()
  const { token } = useAuth()
  const userRaw = token ?? (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null)

  const adm = redirectIfAuthenticated()
  if (adm) return adm

  if (userRaw) {
    const r = jwtPayloadRole(userRaw)
    if (r !== 'admin') return <Navigate to="/app" replace />
  }
  return <Navigate to={{ pathname: '/', search: '?auth=register' }} replace state={loc.state} />
}

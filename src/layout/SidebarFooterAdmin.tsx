import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { markLoginFormWipe } from '../auth/loginFormWipe'
import { jwtPayloadProfile } from '../auth/jwtPayload'

/** В админ-консоли в JWT поле «email» фактически содержит логин администратора (`asoc-admin`). */
export function SidebarFooterAdmin() {
  const navigate = useNavigate()

  const adminTok = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null

  const profile = useMemo(() => {
    if (!adminTok) return null
    return jwtPayloadProfile(adminTok)
  }, [adminTok])

  const login = (profile?.email ?? '').trim()

  if (!adminTok || !login) return null

  return (
    <div className="sidebar-footer-user">
      <div className="sidebar-footer-user-lines">
        <div className="sidebar-footer-user-name" title={login}>
          {login}
        </div>
        <div className="sidebar-footer-user-email">Роль администратора</div>
      </div>
      <button
        type="button"
        className="btn btn-primary sidebar-logout sidebar-footer-user-logout"
        onClick={() => {
          localStorage.removeItem(ADMIN_TOKEN_KEY)
          markLoginFormWipe()
          navigate({ pathname: '/', search: '?auth=login' }, { replace: true, state: { freshLogin: true } })
        }}
      >
        Выход
      </button>
    </div>
  )
}

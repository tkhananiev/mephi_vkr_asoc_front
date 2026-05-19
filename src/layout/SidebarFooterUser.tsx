import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { markLoginFormWipe } from '../auth/loginFormWipe'
import { jwtPayloadProfile } from '../auth/jwtPayload'

/** Профиль пользователя консоли и выход — левый нижний блок сайдбара. */
export function SidebarFooterUser() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const profile = useMemo(() => (token ? jwtPayloadProfile(token) : null), [token])

  if (!profile) return null

  const rawName = profile.name.trim()
  const title = rawName !== '' ? rawName : profile.email.trim().split('@')[0] || 'Пользователь'
  const email = profile.email.trim()

  return (
    <div className="sidebar-footer-user">
      <div className="sidebar-footer-user-lines">
        <div className="sidebar-footer-user-name" title={title}>
          {title}
        </div>
        {email ? (
          <div className="sidebar-footer-user-email" title={email}>
            {email}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="btn btn-primary sidebar-logout sidebar-footer-user-logout"
        onClick={() => {
          logout()
          markLoginFormWipe()
          navigate({ pathname: '/', search: '?auth=login' }, { replace: true, state: { freshLogin: true } })
        }}
      >
        Выход
      </button>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { markLoginFormWipe } from '../auth/loginFormWipe'

/** Кнопка в правой части topbar консоли пользователя. */
export function AppLogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="btn btn-ghost topbar-logout-btn"
      onClick={() => {
        logout()
        markLoginFormWipe()
        navigate({ pathname: '/', search: '?auth=login' }, { replace: true, state: { freshLogin: true } })
      }}
    >
      Выход
    </button>
  )
}

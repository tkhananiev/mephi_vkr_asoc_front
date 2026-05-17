import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { useAuth } from '../auth/AuthContext'
import { markLoginFormWipe } from '../auth/loginFormWipe'
import { jwtPayloadExpiry } from '../auth/jwtPayload'
import { TOKEN_KEY } from '../auth/token'

const IDLE_MS = 15 * 60 * 1000

function subscribeActivity(cb: () => void) {
  const ev = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'] as const
  ev.forEach((e) => window.addEventListener(e, cb, { passive: true }))
  return () => ev.forEach((e) => window.removeEventListener(e, cb))
}

/**
 * 15 минут бездействия — выход из текущей консоли (admin или user).
 * Истечение JWT (`exp`) — выход после проверки (каждые 30 с и при входе на маршрут).
 */
export function SessionLifecycle() {
  const loc = useLocation()
  const nav = useNavigate()
  const { logout, token } = useAuth()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitToFreshLogin = useRef<() => void>(() => {})

  exitToFreshLogin.current = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    if (path.startsWith('/asoc-admin')) {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
    } else if (path.startsWith('/app')) {
      logout()
    }
    markLoginFormWipe()
    nav({ pathname: '/', search: '?auth=login' }, { replace: true, state: { freshLogin: true } })
  }

  useEffect(() => {
    if (!loc.pathname.startsWith('/asoc-admin') && !loc.pathname.startsWith('/app')) {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = null
      return
    }

    function armIdle() {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => {
        idleTimer.current = null
        exitToFreshLogin.current()
      }, IDLE_MS)
    }

    armIdle()
    return subscribeActivity(armIdle)
  }, [loc.pathname])

  useEffect(() => {
    function checkExpFromStorage() {
      if (loc.pathname.startsWith('/asoc-admin')) {
        const adm = localStorage.getItem(ADMIN_TOKEN_KEY)
        if (!adm) return
        const exp = jwtPayloadExpiry(adm)
        if (exp != null && exp * 1000 <= Date.now() + 2500) {
          exitToFreshLogin.current()
        }
        return
      }
      if (loc.pathname.startsWith('/app')) {
        const raw = token ?? localStorage.getItem(TOKEN_KEY)
        if (!raw) return
        const exp = jwtPayloadExpiry(raw)
        if (exp != null && exp * 1000 <= Date.now() + 2500) {
          exitToFreshLogin.current()
        }
      }
    }

    checkExpFromStorage()
    function onVisible() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') checkExpFromStorage()
    }
    document.addEventListener('visibilitychange', onVisible)
    const id = window.setInterval(checkExpFromStorage, 30_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(id)
    }
  }, [loc.pathname, token])

  return null
}

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoginForm } from '../pages/Login'
import { RegisterForm } from '../pages/Register'

/** Оверлей с формой входа или регистрации (?auth=login | ?auth=register). */
export function AuthModal() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mode = params.get('auth')
  const open = mode === 'login' || mode === 'register'

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') navigate('/', { replace: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, navigate])

  if (!open) return null

  function close() {
    navigate('/', { replace: true })
  }

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        className={`auth-modal-dialog card panel-elevated${mode === 'register' ? ' auth-modal-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="auth-modal-close" aria-label="Закрыть" onClick={close}>
          ×
        </button>
        <span id="auth-modal-title" className="sr-only">
          {mode === 'login' ? 'Вход в консоль' : 'Регистрация'}
        </span>
        {mode === 'login' ? <LoginForm key="login" /> : <RegisterForm key="register" />}
      </div>
    </div>
  )
}

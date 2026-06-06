import { type FormEvent, useEffect, useLayoutEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { consumeLoginFormWipe } from '../auth/loginFormWipe'
export function LoginForm() {
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from
  const registered = Boolean((loc.state as { registered?: boolean } | null)?.registered)
  const { setToken } = useAuth()

  const [credentialFormKey, setCredentialFormKey] = useState(0)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useLayoutEffect(() => {
    const sessionWipe = consumeLoginFormWipe()
    const st = loc.state as { freshLogin?: boolean; from?: string; registered?: boolean; email?: string } | undefined
    const freshFromState = Boolean(st?.freshLogin)
    if (!sessionWipe && !freshFromState) return

    setCredentialFormKey((k) => k + 1)
    setIdentifier('')
    setPassword('')
    setErr(null)
    const next: { from?: string } = {}
    if (typeof st?.from === 'string' && st.from.length > 0) next.from = st.from
    nav({ pathname: loc.pathname, search: loc.search }, { replace: true, state: Object.keys(next).length ? next : {} })
  }, [loc.state, loc.pathname, loc.search, nav])

  useEffect(() => {
    if (credentialFormKey <= 0) return
    const zap = () => {
      setIdentifier('')
      setPassword('')
    }
    const ids = [0, 110, 360, 1000].map((ms) => setTimeout(zap, ms))
    return () => ids.forEach(clearTimeout)
  }, [credentialFormKey])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const id = identifier.trim()

    const r = await login(id, password)
    setBusy(false)
    if (!r.ok) {
      setErr('Неверный логин, e-mail или пароль')
      return
    }
    if (r.role === 'admin') {
      localStorage.setItem(ADMIN_TOKEN_KEY, r.token)
      nav('/asoc-admin/dashboard', { replace: true, state: {} })
      return
    }
    setToken(r.token)
    const dest = from && from.startsWith('/app') ? from : '/app'
    nav(dest, { replace: true, state: {} })
  }

  return (
    <div className="auth-card auth-modal-card-inner">
      <div className="auth-card-heading">
        <h1 className="auth-title">Вход в консоль</h1>
        <p className="auth-lead">Пользователь или администратор контура</p>
      </div>

      {registered ? (
        <p className="hint" style={{ marginBottom: '0.75rem' }}>
          Учётная запись создана — войдите с тем же логином или e-mail. Код из письма подтверждается{' '}
          <Link to={{ pathname: '/', search: '?auth=register' }}>в форме регистрации</Link>, если нужно отправить код
          ещё раз.
        </p>
      ) : null}

      <form
        key={`cred-${credentialFormKey}`}
        className="form-grid auth-login-credentials-form"
        autoComplete="off"
        onSubmit={onSubmit}
      >
        <div className="auth-field-honey" aria-hidden>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="username"
            name={`asoc-honey-user-${credentialFormKey}`}
          />
          <input
            type="password"
            tabIndex={-1}
            autoComplete="current-password"
            name={`asoc-honey-pass-${credentialFormKey}`}
          />
        </div>
        <label className="field">
          <span>Логин (админ) или логин / e-mail пользователя</span>
          <input
            type="text"
            name={`asoc-login-${credentialFormKey}`}
            autoComplete="username"
            readOnly
            required
            value={identifier}
            onFocus={(ev) => {
              ev.currentTarget.readOnly = false
            }}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            name={`asoc-password-${credentialFormKey}`}
            autoComplete="current-password"
            readOnly
            required
            minLength={8}
            value={password}
            onFocus={(ev) => {
              ev.currentTarget.readOnly = false
            }}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {err ? <p className="err">{err}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}

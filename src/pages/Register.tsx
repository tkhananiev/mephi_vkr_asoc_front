import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestRegistrationCode, verifyRegistrationCode } from '../api/client'

/** Форма регистрации (модальное окно на главной). */
export function RegisterForm() {
  const nav = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function resetVerificationFlow() {
    setCodeSent(false)
    setCode('')
    setErr(null)
    setOk(null)
  }

  async function onRequestCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setOk(null)
    const r = await requestRegistrationCode({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      patronymic: patronymic.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    setCodeSent(true)
    setOk('Код отправлен на указанный e-mail.')
  }

  async function onVerifyCode() {
    setBusy(true)
    setErr(null)
    setOk(null)
    const r = await verifyRegistrationCode(email.trim(), code.trim())
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    nav({ pathname: '/', search: '?auth=login' }, { replace: true, state: { registered: true, email: email.trim() } })
  }

  return (
    <div className="auth-card auth-modal-card-inner auth-modal-register">
      <div className="auth-card-heading">
        <h1 className="auth-title">Регистрация</h1>
        <p className="auth-lead">Создание учётной записи пользователя контура</p>
      </div>

      <form className="form-grid" onSubmit={onRequestCode}>
        <label className="field">
          <span>Фамилия</span>
          <input
            required
            autoComplete="family-name"
            disabled={codeSent}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Имя</span>
          <input
            required
            autoComplete="given-name"
            disabled={codeSent}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Отчество</span>
          <input
            autoComplete="additional-name"
            disabled={codeSent}
            value={patronymic}
            onChange={(e) => setPatronymic(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Логин</span>
          <input
            required
            minLength={3}
            maxLength={64}
            pattern="[a-zA-Z0-9._-]{3,64}"
            title="латиница, цифры, . _ - от 3 до 64 символов"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="username"
            placeholder="latin_login"
            disabled={codeSent}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          <span>E-mail</span>
          <input
            required
            type="email"
            autoComplete="email"
            disabled={codeSent}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={codeSent}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {codeSent ? (
          <label className="field">
            <span>Код из письма</span>
            <input
              required
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        ) : null}
        {err ? <p className="err">{err}</p> : null}
        {ok ? <p className="hint">{ok}</p> : null}
        {codeSent ? (
          <p className="hint">
            Пароль уже зафиксирован для проверки. Если хотите поменять данные/пароль, нажмите «Изменить данные».
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy || codeSent}>
          {busy ? 'Отправка…' : 'Отправить код'}
        </button>
        {codeSent ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || code.trim().length !== 6}
            onClick={() => void onVerifyCode()}
          >
            {busy ? 'Проверка…' : 'Подтвердить код'}
          </button>
        ) : null}
        {codeSent ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={resetVerificationFlow}>
            Изменить данные
          </button>
        ) : null}
      </form>
      <p className="hint auth-card-footer-link">
        <Link to={{ pathname: '/', search: '?auth=login' }}>Уже есть учётная запись? Войти</Link>
      </p>
    </div>
  )
}

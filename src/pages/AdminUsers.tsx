import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  adminCreateAccount,
  adminDeleteAdmin,
  adminDeleteConsoleUser,
  adminDemoteAdminToUser,
  adminListAccounts,
  adminPatchAdmin,
  adminPatchConsoleUser,
  adminPromoteUserToAdmin,
  adminResetAdminPassword,
  adminResetConsoleUserPassword,
  type AdminAccountRow,
} from '../api/client'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { markLoginFormWipe } from '../auth/loginFormWipe'
import { PageFrame } from '../layout/PageFrame'

type RoleChoice = 'user' | 'admin'

function emptyDemoteForm() {
  return {
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    patronymic: '',
  }
}

export function AdminUsers() {
  const nav = useNavigate()
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<RoleChoice>('user')
  const [newEmail, setNewEmail] = useState('')
  const [newLogin, setNewLogin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newPatronymic, setNewPatronymic] = useState('')
  const [createFormNonce, setCreateFormNonce] = useState(0)

  const [demoteModal, setDemoteModal] = useState<AdminAccountRow | null>(null)
  const [demoteForm, setDemoteForm] = useState(emptyDemoteForm())
  const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    if (rowMenuOpen === null) return
    function closeOnOutside(ev: MouseEvent) {
      const t = ev.target as HTMLElement | null
      if (t?.closest('[data-admin-user-menu]')) return
      setRowMenuOpen(null)
    }
    function onEscape(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setRowMenuOpen(null)
    }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [rowMenuOpen])

  const load = useCallback(async () => {
    setErr(null)
    const r = await adminListAccounts()
    if (!r.ok) {
      if (r.unauthorized) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        markLoginFormWipe()
        nav({ pathname: '/', search: '?auth=login' }, { replace: true, state: { freshLogin: true } })
        return
      }
      setErr(r.error)
      return
    }
    setAccounts(r.accounts)
  }, [nav])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const k = demoteModal?.stable_id
    if (k == null) return
    void load()
  }, [demoteModal?.stable_id, load])

  function clearCreateFields() {
    setNewRole('user')
    setNewEmail('')
    setNewLogin('')
    setNewPassword('')
    setNewUsername('')
    setNewFirstName('')
    setNewLastName('')
    setNewPatronymic('')
    setCreateFormNonce((n) => n + 1)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const pw = newPassword
    const r =
      newRole === 'user'
        ? await adminCreateAccount({
            role: 'user',
            email: newEmail.trim(),
            username: newUsername.trim(),
            first_name: newFirstName.trim(),
            last_name: newLastName.trim(),
            patronymic: newPatronymic.trim(),
            password: pw,
          })
        : await adminCreateAccount({ role: 'admin', login: newLogin.trim(), password: pw })
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    clearCreateFields()
    await load()
  }

  async function toggleDisabled(u: AdminAccountRow) {
    setRowMenuOpen(null)
    setErr(null)
    const r =
      u.kind === 'user'
        ? await adminPatchConsoleUser(u.id, { disabled: !u.disabled })
        : await adminPatchAdmin(u.id, { disabled: !u.disabled })
    if (!r.ok) {
      setErr(r.error)
      return
    }
    await load()
  }

  async function onResetPassword(u: AdminAccountRow) {
    setRowMenuOpen(null)
    const pw = window.prompt('Новый пароль (не менее 8 символов)')
    if (!pw || pw.length < 8) return
    setErr(null)
    const r =
      u.kind === 'user'
        ? await adminResetConsoleUserPassword(u.id, pw)
        : await adminResetAdminPassword(u.id, pw)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    await load()
  }

  async function onDelete(u: AdminAccountRow) {
    setRowMenuOpen(null)
    if (
      !window.confirm(
        `Удалить учётную запись ${u.stable_id} (${u.kind === 'user' ? u.username || u.email : u.login})? Это действие необратимо.`,
      )
    ) {
      return
    }
    setErr(null)
    setRowBusy(u.stable_id)
    const r = u.kind === 'user' ? await adminDeleteConsoleUser(u.id) : await adminDeleteAdmin(u.id)
    setRowBusy(null)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    await load()
  }

  function openDemote(admin: AdminAccountRow) {
    if (admin.kind !== 'admin') return
    const cand = admin.login.trim()
    setDemoteForm({
      ...emptyDemoteForm(),
      username: /^[a-zA-Z0-9._-]{3,64}$/.test(cand) ? cand : '',
    })
    setDemoteModal(admin)
  }

  async function submitDemote(e: FormEvent) {
    e.preventDefault()
    if (!demoteModal) return
    setErr(null)
    setBusy(true)
    const r = await adminDemoteAdminToUser(demoteModal.id, demoteForm)
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    setDemoteModal(null)
    setDemoteForm(emptyDemoteForm())
    await load()
  }

  async function onRoleSelect(u: AdminAccountRow, target: RoleChoice) {
    if (u.kind === target) return
    setErr(null)
    if (target === 'admin' && u.kind === 'user') {
      const suggested = u.username.trim()
      const loginInput = window.prompt('Логин для входа в админ-консоль (латиница, как у записи пользователя)', suggested)
      if (loginInput === null) {
        await load()
        return
      }
      const login = loginInput.trim() || suggested
      if (!login) {
        setErr('Нужен непустой логин администратора')
        await load()
        return
      }
      if (
        !window.confirm(
          `Назначить пользователя «${u.display_name || u.username}» администратором с логином «${login}»? Запись в консоли пользователя будет удалена (пароль сохранится).`,
        )
      ) {
        await load()
        return
      }

      setRowBusy(u.stable_id)
      const pr = await adminPromoteUserToAdmin(u.id, login !== suggested ? login : undefined)
      setRowBusy(null)
      if (!pr.ok) setErr(pr.error)
      await load()
      return
    }
    if (target === 'user' && u.kind === 'admin') {
      openDemote(u)
      return
    }
  }

  return (
    <PageFrame eyebrow="Администрирование" title="Пользователи">
      <div style={{ maxWidth: 1440, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <section className="card panel-elevated" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Новый пользователь</h2>
          <form
            key={createFormNonce}
            autoComplete="off"
            className="form-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
            onSubmit={onCreate}
          >
            <label className="field">
              <span>Роль</span>
              <select
                autoComplete="off"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as RoleChoice)}
                style={{ width: '100%' }}
              >
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
              </select>
            </label>
            {newRole === 'user' ? (
              <>
                <label className="field">
                  <span>Фамилия</span>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Имя</span>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Отчество</span>
                  <input type="text" autoComplete="off" value={newPatronymic} onChange={(e) => setNewPatronymic(e.target.value)} />
                </label>
                <label className="field">
                  <span>Логин</span>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={64}
                    pattern="[a-zA-Z0-9._-]{3,64}"
                    title="латиница, цифры, . _ - от 3 до 64"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoComplete="off"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>E-mail</span>
                  <input type="email" required autoComplete="off" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </label>
              </>
            ) : (
              <label className="field">
                <span>Логин</span>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="off"
                  value={newLogin}
                  onChange={(e) => setNewLogin(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span>Пароль</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Создать
              </button>
            </div>
          </form>
        </section>

        {err ? (
          <p className="err" style={{ marginBottom: '1rem' }}>
            {err}
          </p>
        ) : null}

        <section className="card panel-elevated" style={{ padding: 0, overflowX: 'auto', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <table className="admin-users-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.65rem 1rem', width: '2.25rem' }}>№</th>
                <th style={{ padding: '0.65rem 1rem' }}>Учётная запись</th>
                <th style={{ padding: '0.65rem 1rem' }}>Роль</th>
                <th style={{ padding: '0.65rem 1rem' }}>Логин</th>
                <th style={{ padding: '0.65rem 1rem' }}>E-mail</th>
                <th style={{ padding: '0.65rem 1rem' }}>ФИО</th>
                <th style={{ padding: '0.65rem 1rem' }}>Создан</th>
                <th style={{ padding: '0.65rem 0.85rem', width: '3rem', textAlign: 'right' }} aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((u, idx) => (
                <tr key={u.stable_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '0.5rem 1rem', fontWeight: 600 }} className="mono">
                    {u.stable_id}
                  </td>
                  <td style={{ padding: '0.5rem 1rem' }}>
                    <select
                      autoComplete="off"
                      disabled={!!rowBusy}
                      value={demoteModal && u.kind === 'admin' && demoteModal.stable_id === u.stable_id ? 'admin' : u.kind}
                      onChange={(e) => void onRoleSelect(u, e.target.value as RoleChoice)}
                      style={{
                        padding: '0.25rem 0.35rem',
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        background: '#fff',
                        maxWidth: '11rem',
                      }}
                    >
                      <option value="user">Пользователь</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem 1rem' }}>{u.kind === 'user' ? u.username || '—' : u.login}</td>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)' }}>{u.kind === 'user' ? u.email : '—'}</td>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)' }}>{u.kind === 'user' ? u.display_name || '—' : '—'}</td>
                  <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {u.created_at?.slice(0, 19)?.replace('T', ' ') ?? '—'}
                  </td>
                  <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', verticalAlign: 'middle' }}>
                    <div className="admin-users-menu" data-admin-user-menu>
                      <button
                        type="button"
                        className="admin-users-kebab-btn"
                        disabled={!!rowBusy}
                        aria-haspopup="menu"
                        aria-expanded={rowMenuOpen === u.stable_id}
                        aria-label={`Действия для ${u.stable_id}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setRowMenuOpen((prev) => (prev === u.stable_id ? null : u.stable_id))
                        }}
                      >
                        <span aria-hidden className="admin-users-kebab-dots">
                          ⋮
                        </span>
                      </button>
                      {rowMenuOpen === u.stable_id ? (
                        <ul className="admin-users-kebab-panel" role="menu">
                          <li role="presentation">
                            <button
                              type="button"
                              role="menuitem"
                              className="admin-users-kebab-item"
                              disabled={!!rowBusy}
                              onClick={() => void onResetPassword(u)}
                            >
                              Сбросить пароль
                            </button>
                          </li>
                          <li role="presentation">
                            <button
                              type="button"
                              role="menuitem"
                              className="admin-users-kebab-item"
                              disabled={!!rowBusy}
                              onClick={() => void toggleDisabled(u)}
                            >
                              {u.disabled ? 'Разблокировать' : 'Заблокировать'}
                            </button>
                          </li>
                          <li role="presentation">
                            <button
                              type="button"
                              role="menuitem"
                              className="admin-users-kebab-item admin-users-kebab-item--danger"
                              disabled={!!rowBusy}
                              onClick={() => void onDelete(u)}
                            >
                              Удалить
                            </button>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {demoteModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demote-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDemoteModal(null)
              setDemoteForm(emptyDemoteForm())
            }
          }}
        >
          <div className="card panel-elevated" style={{ padding: '1rem 1.25rem', maxWidth: 560, width: '100%' }} onMouseDown={(e) => e.stopPropagation()}>
            <h3 id="demote-title" style={{ margin: '0 0 0.65rem', fontSize: '1rem' }}>
              Перевести администратора в пользователи консоли
            </h3>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Учётная запись администратора <span className="mono">{demoteModal.stable_id}</span> будет удалена; будет создан пользователь консоли с тем же паролем. Должен остаться хотя бы ещё один администратор.
            </p>
            <form onSubmit={submitDemote} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <label className="field">
                <span>E-mail</span>
                <input type="email" required autoComplete="off" value={demoteForm.email} onChange={(e) => setDemoteForm({ ...demoteForm, email: e.target.value })} />
              </label>
              <label className="field">
                <span>Логин (латиница, 3–64)</span>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={64}
                  pattern="[a-zA-Z0-9._-]{3,64}"
                  autoComplete="off"
                  value={demoteForm.username}
                  onChange={(e) => setDemoteForm({ ...demoteForm, username: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Фамилия</span>
                <input type="text" required autoComplete="off" value={demoteForm.last_name} onChange={(e) => setDemoteForm({ ...demoteForm, last_name: e.target.value })} />
              </label>
              <label className="field">
                <span>Имя</span>
                <input type="text" required autoComplete="off" value={demoteForm.first_name} onChange={(e) => setDemoteForm({ ...demoteForm, first_name: e.target.value })} />
              </label>
              <label className="field">
                <span>Отчество</span>
                <input type="text" autoComplete="off" value={demoteForm.patronymic} onChange={(e) => setDemoteForm({ ...demoteForm, patronymic: e.target.value })} />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setDemoteModal(null)
                    setDemoteForm(emptyDemoteForm())
                  }}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Создать пользователя и снять роль админа
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageFrame>
  )
}

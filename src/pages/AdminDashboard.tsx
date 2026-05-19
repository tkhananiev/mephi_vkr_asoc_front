import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  adminListAccounts,
  fetchCatalogStatusAsAdmin,
  fetchSyncRunsAsAdmin,
  postSyncAsAdmin,
  probeHealth,
  type CatalogSyncPostPath,
  type HealthStatus,
} from '../api/client'
import type { CatalogStatusResponse, SyncRunRow } from '../api/types'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { markLoginFormWipe } from '../auth/loginFormWipe'
import { RunningSyncLivePanel } from '../components/RunningSyncLivePanel'
import { PageFrame } from '../layout/PageFrame'

const POLL_MS_WHILE_SYNCING = 2500
const RUN_FETCH_LIMIT = 15
const RUN_PAGE_SIZE = 5
const RUN_WINDOW_24H_MS = 24 * 60 * 60 * 1000

function parseStartedAtMs(iso?: string): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

function isUnauthorized(msg: string) {
  return /\b401\b/.test(msg)
}

const healthPaths: { id: string; label: string; path: string }[] = [
  { id: 'api', label: 'API', path: '/health' },
  { id: 'auth', label: 'Auth', path: '/health/auth' },
  { id: 'ref', label: 'Reference', path: '/health/reference' },
]

function HealthDot({ s }: { s: HealthStatus }) {
  const cls =
    s === 'ok' ? 'health-lamp health-lamp--ok' : s === 'pending' ? 'health-lamp health-lamp--pending' : 'health-lamp health-lamp--fail'
  return (
    <span className={cls} style={{ transform: 'scale(0.85)' }} role="img" aria-label={s}>
      <span className="health-lamp-dot" />
    </span>
  )
}

export function AdminDashboard() {
  const nav = useNavigate()
  const [userN, setUserN] = useState(0)
  const [adminN, setAdminN] = useState(0)
  const [disabledN, setDisabledN] = useState(0)
  const [catalog, setCatalog] = useState<CatalogStatusResponse | null>(null)
  const [runs, setRuns] = useState<SyncRunRow[] | null>(null)
  /** По умолчанию только последние сутки по started_at — не раздуваем экран ниже блока синка. */
  const [runsWindow, setRunsWindow] = useState<'24h' | 'all'>('24h')
  const [runsPage, setRunsPage] = useState(0)
  const [health, setHealth] = useState<Record<string, HealthStatus>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const kickIf401 = useCallback(
    (msg: string) => {
      if (isUnauthorized(msg)) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        markLoginFormWipe()
        nav({ pathname: '/', search: '?auth=login' }, { replace: true, state: { freshLogin: true } })
        return true
      }
      return false
    },
    [nav],
  )

  const loadAccounts = useCallback(async () => {
    const r = await adminListAccounts()
    if (!r.ok) {
      if (r.unauthorized || isUnauthorized(r.error)) {
        kickIf401(r.error || '401')
        return
      }
      setErr(r.error)
      return
    }
    setErr(null)
    let u = 0
    let a = 0
    let d = 0
    for (const x of r.accounts) {
      if (x.kind === 'user') u++
      else a++
      if (x.disabled) d++
    }
    setUserN(u)
    setAdminN(a)
    setDisabledN(d)
  }, [kickIf401])

  const loadApi = useCallback(
    async (opts?: { clearSyncBanner?: boolean }) => {
      if (opts?.clearSyncBanner) setSyncMsg(null)
      const [c, s] = await Promise.all([fetchCatalogStatusAsAdmin(), fetchSyncRunsAsAdmin(RUN_FETCH_LIMIT)])
      if (!c.ok) {
        if (kickIf401(c.error)) return
        setErr(c.error)
        setCatalog(null)
      } else {
        setErr(null)
        setCatalog(c.data)
      }
      if (!s.ok) {
        if (kickIf401(s.error)) return
        setRuns(null)
      } else {
        setRuns(s.data)
      }
    },
    [kickIf401],
  )

  const pollSyncPanels = useCallback(async () => {
    const [c, s] = await Promise.all([fetchCatalogStatusAsAdmin(), fetchSyncRunsAsAdmin(RUN_FETCH_LIMIT)])
    if (!c.ok) {
      kickIf401(c.error)
      return
    }
    setCatalog(c.data)
    if (s.ok) setRuns(s.data)
    else kickIf401(s.error)
  }, [kickIf401])

  const pollHealth = useCallback(async () => {
    const next: Record<string, HealthStatus> = {}
    await Promise.all(
      healthPaths.map(async (h) => {
        next[h.id] = await probeHealth(h.path)
      }),
    )
    setHealth(next)
  }, [])

  useEffect(() => {
    void loadAccounts()
    void loadApi()
    void pollHealth()
    const t = setInterval(() => void pollHealth(), 20_000)
    return () => clearInterval(t)
  }, [loadAccounts, loadApi, pollHealth])

  useEffect(() => {
    const active = !!(catalog?.sync_in_progress || busy)
    if (!active) return
    void pollSyncPanels()
    const id = window.setInterval(() => void pollSyncPanels(), POLL_MS_WHILE_SYNCING)
    return () => clearInterval(id)
  }, [catalog?.sync_in_progress, busy, pollSyncPanels])

  const recordCountRows = useMemo(() => {
    if (!catalog?.record_counts) return []
    return Object.entries(catalog.record_counts).sort(([a], [b]) => a.localeCompare(b))
  }, [catalog])

  const recordCountTotal = useMemo(() => recordCountRows.reduce((s, [, n]) => s + n, 0), [recordCountRows])

  const filteredSyncRuns = useMemo(() => {
    const list = runs ?? []
    if (runsWindow !== '24h') return list
    const since = Date.now() - RUN_WINDOW_24H_MS
    return list.filter((row) => {
      const ts = parseStartedAtMs(row.started_at)
      return ts !== null && ts >= since
    })
  }, [runs, runsWindow])

  useEffect(() => {
    setRunsPage(0)
  }, [runsWindow, runs])

  const filteredSyncTotalPages = Math.max(1, Math.ceil(filteredSyncRuns.length / RUN_PAGE_SIZE))
  const syncedRunsPaginated = useMemo(() => {
    const safePage = Math.min(Math.max(0, runsPage), filteredSyncTotalPages - 1)
    const start = safePage * RUN_PAGE_SIZE
    return filteredSyncRuns.slice(start, start + RUN_PAGE_SIZE)
  }, [filteredSyncRuns, runsPage, filteredSyncTotalPages])

  useEffect(() => {
    if (runsPage > 0 && runsPage >= filteredSyncTotalPages) {
      setRunsPage(Math.max(0, filteredSyncTotalPages - 1))
    }
  }, [runsPage, filteredSyncTotalPages])

  async function runSync(path: CatalogSyncPostPath, query: string, label: string) {
    setBusy(label)
    setSyncMsg(null)
    const r = await postSyncAsAdmin(path, query)
    setBusy(null)
    if (!r.ok) {
      if (kickIf401(r.error)) return
      const clash = r.status === 409 ? ' Задача этого типа уже выполняется.' : ''
      setSyncMsg(`${r.error}${clash}`)
      return
    }
    const hintRu = r.hint ? ` (${r.hint})` : ''
    setSyncMsg(
      `Запрос принят (HTTP ${r.status}). Блок «Сейчас в работе» и счётчики обновляются сами каждые ~${Math.round(POLL_MS_WHILE_SYNCING / 1000)} с.${hintRu}`,
    )
    await loadApi()
  }

  async function runSyncManualRefresh() {
    await loadApi({ clearSyncBanner: true })
  }

  return (
    <PageFrame eyebrow="Администрирование" title="Обзор">
      <div style={{ maxWidth: 1440, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {err ? (
          <p className="err" role="alert">
            {err}
          </p>
        ) : null}

        <section className="card panel-elevated" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Учётные записи</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="card" style={{ padding: '0.75rem 1rem', minWidth: 140 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Пользователи ЛК</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 600 }}>{userN}</div>
            </div>
            <div className="card" style={{ padding: '0.75rem 1rem', minWidth: 140 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Администраторы</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 600 }}>{adminN}</div>
            </div>
            <div className="card" style={{ padding: '0.75rem 1rem', minWidth: 140 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Отключённых учёток</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 600 }}>{disabledN}</div>
            </div>
            <div style={{ alignSelf: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <NavLink to="/asoc-admin/users" className="btn btn-primary">
                Управление пользователями
              </NavLink>
              <NavLink to="/asoc-admin/scanners" className="btn btn-ghost">
                Инструменты
              </NavLink>
            </div>
          </div>
        </section>

        <section className="card panel-elevated" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Сервисы (кратко)</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
            {healthPaths.map((h) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
                <HealthDot s={health[h.id] ?? 'pending'} />
                <span>{h.label}</span>
                <code style={{ fontSize: '0.78rem', opacity: 0.85 }}>{h.path}</code>
              </div>
            ))}
            <NavLink to="/asoc-admin/health" className="btn btn-ghost" style={{ marginLeft: 'auto' }}>
              Все сервисы
            </NavLink>
            <button type="button" className="btn btn-ghost" onClick={() => void pollHealth()}>
              Обновить
            </button>
          </div>
        </section>

        <section className="card panel-elevated" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Справочники · синхронизация</h2>
          {catalog ? (
            <>
              <p className="mono" style={{ margin: '0 0 0.35rem', fontSize: '0.9rem', opacity: 0.92 }}>
                Записей в каталоге по всем источникам:{' '}
                <strong>{recordCountTotal}</strong>
                {catalog.sync_in_progress ? ' · сейчас идёт синхронизация' : ''}
              </p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Счётчики — это строки в БД по полю <code className="mono">source_code</code> (не только RSS). Кнопка «RSS»
                дополняет каталог с ленты; полный объём БДУ — bulk (файлы на томе или загрузка с ФСТЭК, если том пустой).
              </p>
              <RunningSyncLivePanel
                rows={catalog.running_syncs ?? []}
                pollSeconds={catalog.sync_in_progress ? POLL_MS_WHILE_SYNCING / 1000 : undefined}
                waitingForRows={catalog.sync_in_progress && (catalog.running_syncs?.length ?? 0) === 0}
              />
              <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.35rem 0.5rem' }}>Источник (код)</th>
                      <th style={{ padding: '0.35rem 0.5rem' }}>Записей</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordCountRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                          Нет строк в каталоге
                        </td>
                      </tr>
                    ) : (
                      recordCountRows.map(([code, n]) => (
                        <tr key={code} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.35rem 0.5rem' }} className="mono">
                            {code}
                          </td>
                          <td style={{ padding: '0.35rem 0.5rem' }}>{n}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Статус каталога недоступен</p>
          )}
          {syncMsg ? <div className="msg-banner" style={{ marginBottom: '0.75rem' }}>{syncMsg}</div> : null}
          {busy ? (
            <div className="msg-banner" style={{ marginBottom: '0.75rem', borderColor: 'rgba(0, 91, 171, 0.35)' }}>
              Отправка запроса: <strong>{busy}</strong>…
            </div>
          ) : null}
          <div className="action-grid" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="action-card accent-bdu"
              disabled={!!busy}
              onClick={() => runSync('/api/v1/sync/bdu', '', 'БДУ (RSS)')}
            >
              <h4>БДУ ФСТЭК</h4>
              <p>RSS-лента</p>
            </button>
            <button
              type="button"
              className="action-card accent-warn"
              disabled={!!busy}
              onClick={() => {
                if (
                  !window.confirm(
                    'БДУ bulk: полная загрузка каталога из файлов на томе reference-data-service. Обычно долго и тяжело для CPU/диска. Продолжить?',
                  )
                )
                  return
                void runSync('/api/v1/sync/bdu/bulk', '', 'БДУ bulk')
              }}
            >
              <h4>БДУ · полный каталог</h4>
              <p>POST …/sync/bdu/bulk</p>
            </button>
            <button
              type="button"
              className="action-card accent-nvd"
              disabled={!!busy}
              onClick={() => runSync('/api/v1/sync/nvd', '', 'NVD · инкремент')}
            >
              <h4>NVD · инкремент</h4>
              <p>Повторные синки без full=1.</p>
            </button>
            <button
              type="button"
              className="action-card accent-warn"
              disabled={!!busy}
              onClick={() => runSync('/api/v1/sync/nvd', '?full=1', 'NVD · полностью')}
            >
              <h4>NVD · полностью</h4>
              <p>Первый раз или с full=1.</p>
            </button>
            <button
              type="button"
              className="action-card"
              disabled={!!busy}
              onClick={() => runSync('/api/v1/sync/all', '', 'Все источники')}
            >
              <h4>Все источники</h4>
              <p>По очереди БДУ и NVD</p>
            </button>
          </div>
          <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => void runSyncManualRefresh()}>
            Обновить статус и прогоны
          </button>

          <div
            style={{
              margin: '1rem 0 0.35rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.65rem',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Последние прогоны</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Период:</span>
              <button
                type="button"
                className={`btn ${runsWindow === '24h' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.82rem', padding: '0.28rem 0.7rem' }}
                disabled={runs === null}
                onClick={() => setRunsWindow('24h')}
              >
                За 24 часа
              </button>
              <button
                type="button"
                className={`btn ${runsWindow === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.82rem', padding: '0.28rem 0.7rem' }}
                disabled={runs === null}
                onClick={() => setRunsWindow('all')}
              >
                Все (до {RUN_FETCH_LIMIT})
              </button>
            </div>
          </div>
          {runs !== null && runsWindow === 'all' ? (
            <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Из API загружается не более последних{' '}
              <code className="mono">{RUN_FETCH_LIMIT}</code> прогонов; полная история — в базе данных.
            </p>
          ) : null}
          {runs !== null && filteredSyncTotalPages > 1 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginBottom: '0.4rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                Стр. {Math.min(runsPage + 1, filteredSyncTotalPages)} из {filteredSyncTotalPages}{' '}
                <span style={{ opacity: 0.82 }}>(по {RUN_PAGE_SIZE})</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
                disabled={runsPage <= 0}
                onClick={() => setRunsPage((p) => Math.max(0, p - 1))}
              >
                Назад
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
                disabled={runsPage >= filteredSyncTotalPages - 1}
                onClick={() => setRunsPage((p) => Math.min(filteredSyncTotalPages - 1, p + 1))}
              >
                Вперёд
              </button>
            </div>
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Источник</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Статус</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Обнаружено</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Обработано</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Вставлено</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Обновлено</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Начало</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Окончание</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {runs === null ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                      Данные прогонов ещё не загружены
                    </td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                      Нет сохранённых прогонов
                    </td>
                  </tr>
                ) : filteredSyncRuns.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                      За последние 24 часа прогонов нет — переключитесь на «Все», чтобы видеть более старые записи среди последних{' '}
                      {RUN_FETCH_LIMIT}.
                    </td>
                  </tr>
                ) : (
                  syncedRunsPaginated.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.35rem 0.5rem' }}>{row.source_code}</td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>{row.status}</td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>{row.items_discovered ?? '—'}</td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>{row.items_processed ?? '—'}</td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>{row.items_inserted ?? '—'}</td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>{row.items_updated ?? '—'}</td>
                      <td style={{ padding: '0.35rem 0.5rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {row.started_at?.slice(0, 19)?.replace('T', ' ') ?? '—'}
                      </td>
                      <td style={{ padding: '0.35rem 0.5rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {row.finished_at?.slice(0, 19)?.replace('T', ' ') ?? '—'}
                      </td>
                      <td style={{ padding: '0.35rem 0.5rem', maxWidth: 420 }} className="mono">
                        {row.error_message
                          ? row.error_message.length > 80
                            ? `${row.error_message.slice(0, 80)}…`
                            : row.error_message
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Расписание фонового синка задаётся в reference-data-service (переменные{' '}
            <code className="mono">APP_SYNC_*</code> в деплое).
          </p>
        </section>

        <section className="card panel-elevated" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Спецификация и рабочие ссылки</h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.6 }}>
            <li>
              <a href="/openapi.yaml" target="_blank" rel="noreferrer">
                OpenAPI (openapi.yaml)
              </a>
              {' · '}
              <a href="/swagger" target="_blank" rel="noreferrer">
                Swagger UI
              </a>
            </li>
            <li>
              <a href="/jira" target="_blank" rel="noreferrer">
                Интеграция Jira (режим симуляции)
              </a>
            </li>
            <li>
              Сканирование и оперативная отчётность — в{' '}
              <NavLink to="/app">рабочей консоли</NavLink>
              {' '}
              (разделы «Скан» и «Отчёт» после входа).
            </li>
          </ul>
        </section>

        <section className="card panel-elevated" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Безопасность и ограничения</h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.65, fontSize: '0.9rem' }}>
            <li>Пароли учётных записей: минимум 8 символов (enforcement на auth-service).</li>
            <li>Время жизни JWT задаётся в деплое auth-service (<code className="mono">AUTH_JWT_TTL</code>).</li>
            <li>
              Журнал последних входов, IP клиента и мгновенный отзыв всех выпущенных токенов требуют доработки бэкенда
              (сохранение событий / blocklist) — в текущей версии не реализовано.
            </li>
            <li>Двухфакторная аутентификация в текущей конфигурации не включена.</li>
          </ul>
        </section>
      </div>
    </PageFrame>
  )
}

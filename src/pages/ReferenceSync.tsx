import { useCallback, useEffect, useMemo, useState } from 'react'
import { RunningSyncLivePanel } from '../components/RunningSyncLivePanel'
import { fetchCatalogStatus, fetchSyncRuns, postSync, type CatalogSyncPostPath } from '../api/client'
import type { CatalogStatusResponse, SyncRunRow } from '../api/types'
import { PageFrame } from '../layout/PageFrame'

const POLL_MS_IDLE = 15_000
const POLL_MS_LIVE = 3000

export function ReferenceSync() {
  const [runs, setRuns] = useState<SyncRunRow[] | null>(null)
  const [catalog, setCatalog] = useState<CatalogStatusResponse | null>(null)
  const [catalogErr, setCatalogErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const recordCountRows = useMemo(() => {
    if (!catalog?.record_counts) return []
    return Object.entries(catalog.record_counts).sort(([a], [b]) => a.localeCompare(b))
  }, [catalog])

  const recordCountTotal = useMemo(() => recordCountRows.reduce((s, [, n]) => s + n, 0), [recordCountRows])

  const snapshotCatalogAndRuns = useCallback(async () => {
    const [c, s] = await Promise.all([fetchCatalogStatus(), fetchSyncRuns(20)])
    if (!c.ok) {
      setCatalog(null)
      setCatalogErr(c.error)
      return
    }
    setCatalogErr(null)
    setCatalog(c.data)
    if (!s.ok) {
      setRuns(null)
      setMsg(s.error)
      return
    }
    setRuns(s.data)
  }, [])

  const loadRuns = useCallback(async () => {
    setMsg(null)
    await snapshotCatalogAndRuns()
  }, [snapshotCatalogAndRuns])

  useEffect(() => {
    void snapshotCatalogAndRuns()
    const ms = catalog?.sync_in_progress || busy ? POLL_MS_LIVE : POLL_MS_IDLE
    const id = window.setInterval(() => void snapshotCatalogAndRuns(), ms)
    return () => clearInterval(id)
  }, [snapshotCatalogAndRuns, catalog?.sync_in_progress, busy])

  async function run(path: CatalogSyncPostPath, query = '', label: string) {
    setBusy(label)
    setMsg(null)
    const r = await postSync(path, query)
    setBusy(null)
    if (!r.ok) {
      setMsg(r.error)
      return
    }
    setMsg(`Принято (HTTP ${r.status}). Ниже — автообновление прогона и счётчиков каждые ${POLL_MS_LIVE / 1000} с, пока синк активен.`)
    await loadRuns()
  }

  return (
    <PageFrame
      eyebrow="Справочник"
      title="БДУ · NVD"
      lead="NVD: обычные повторные синки — инкремент. Полностью — только первый раз (пустой курсор) или при вызове с full=1."
      badge="reference-data :8081"
    >
      {catalogErr ? (
        <div className="msg-banner" style={{ marginBottom: '0.75rem' }}>
          Статус каталога недоступен: {catalogErr}
        </div>
      ) : null}
      {catalog ? (
        <div style={{ marginBottom: '1rem' }}>
          <p className="mono" style={{ opacity: 0.92, fontSize: '0.9rem', margin: '0 0 0.35rem' }}>
            Записей в каталоге по всем источникам: <strong>{recordCountTotal}</strong>
            {catalog.sync_in_progress ? ' · сейчас идёт синхронизация' : ''}
          </p>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Все счётчики — по <code className="mono">source_code</code> в БД. RSS и bulk пишут в одни и те же таблицы;
            после bulk число строк БДУ отражает полный каталог, а не только ленту.
          </p>
          <RunningSyncLivePanel
            rows={catalog.running_syncs ?? []}
            pollSeconds={(catalog.sync_in_progress || busy ? POLL_MS_LIVE : POLL_MS_IDLE) / 1000}
          />
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>source_code</th>
                  <th>записей</th>
                </tr>
              </thead>
              <tbody>
                {recordCountRows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="table-empty">
                      Нет записей в каталоге
                    </td>
                  </tr>
                ) : (
                  recordCountRows.map(([code, n]) => (
                    <tr key={code}>
                      <td>
                        <code style={{ color: 'var(--accent-2)' }}>{code}</code>
                      </td>
                      <td>{n}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {msg ? <div className="msg-banner">{msg}</div> : null}
      {busy ? (
        <div className="msg-banner" style={{ borderColor: 'rgba(0, 91, 171, 0.35)' }}>
          Выполняется: {busy}…
        </div>
      ) : null}

      <div className="action-grid">
        <button
          type="button"
          className="action-card accent-bdu"
          disabled={!!busy}
          onClick={() => run('/api/v1/sync/bdu', '', 'БДУ (RSS)')}
        >
          <h4>БДУ ФСТЭК</h4>
          <p>RSS-лента, запись в catalog / raw / audit</p>
        </button>
        <button
          type="button"
          className="action-card accent-warn"
          disabled={!!busy}
          onClick={() => {
            if (
              !window.confirm(
                'БДУ bulk: полная загрузка из файлов на томе сервиса — обычно долго. Продолжить?',
              )
            )
              return
            void run('/api/v1/sync/bdu/bulk', '', 'БДУ bulk')
          }}
        >
          <h4>БДУ · полный каталог</h4>
          <p>POST …/sync/bdu/bulk</p>
        </button>
        <button
          type="button"
          className="action-card accent-nvd"
          disabled={!!busy}
          onClick={() => run('/api/v1/sync/nvd', '?cve_id=CVE-2021-44228', 'NVD одна CVE')}
        >
          <h4>NVD · одна CVE</h4>
          <p>Быстрый тест, например Log4Shell</p>
        </button>
        <button
          type="button"
          className="action-card accent-nvd"
          disabled={!!busy}
          onClick={() => run('/api/v1/sync/nvd', '', 'NVD · инкремент')}
        >
          <h4>NVD · инкремент</h4>
          <p>Обычные повторные синки (без full=1).</p>
        </button>
        <button
          type="button"
          className="action-card accent-warn"
          disabled={!!busy}
          onClick={() => run('/api/v1/sync/nvd', '?full=1', 'NVD · полностью')}
        >
          <h4>NVD · полностью</h4>
          <p>Только первый раз по пустому курсору или с параметром full=1.</p>
        </button>
        <button
          type="button"
          className="action-card accent-warn"
          disabled={!!busy}
          onClick={() => run('/api/v1/sync/all', '', 'БДУ + NVD')}
        >
          <h4>БДУ + NVD</h4>
          <p>Оба источника подряд</p>
        </button>
        <button type="button" className="action-card" onClick={() => loadRuns()}>
          <h4>Обновить прогоны</h4>
          <p>GET /api/v1/sync/runs</p>
        </button>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>id</th>
              <th>source</th>
              <th>status</th>
              <th>discovered</th>
              <th>processed</th>
              <th>inserted</th>
              <th>updated</th>
              <th>started</th>
              <th>finished</th>
            </tr>
          </thead>
          <tbody>
            {runs === null ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  Нажмите «Обновить прогоны», чтобы подтянуть audit.reference_sync_runs
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  Записей ещё нет
                </td>
              </tr>
            ) : (
              runs.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <code style={{ color: 'var(--accent-2)' }}>{row.source_code}</code>
                  </td>
                  <td>
                    <span className="badge">{row.status}</span>
                  </td>
                  <td>{row.items_discovered ?? '—'}</td>
                  <td>{row.items_processed ?? '—'}</td>
                  <td>{row.items_inserted ?? '—'}</td>
                  <td>{row.items_updated ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {row.started_at ? String(row.started_at).replace('T', ' ').slice(0, 19) : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {row.finished_at ? String(row.finished_at).replace('T', ' ').slice(0, 19) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  )
}

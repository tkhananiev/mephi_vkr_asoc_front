import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchIntegrationsCatalog } from '../api/client'
import {
  INTEGRATIONS_CATALOG,
  type IntegrationCatalogEntry,
} from '../lib/integrationsRegistry'
import { PageFrame } from '../layout/PageFrame'

function kindLabel(k: IntegrationCatalogEntry['kind']): string {
  switch (k) {
    case 'SAST':
      return 'SAST'
    case 'SCA':
      return 'SCA'
    case 'DAST':
      return 'DAST'
    default:
      return k
  }
}

function statusBadge(row: IntegrationCatalogEntry) {
  if (row.runtime.phase === 'planned') {
    return (
      <span
        style={{
          fontSize: '0.75rem',
          padding: '0.2rem 0.55rem',
          borderRadius: 999,
          background: 'var(--bg-raised, #f5f5f5)',
          color: 'var(--text-muted)',
        }}
      >
        в планах
      </span>
    )
  }
  if (row.enabled === false) {
    return (
      <span
        style={{
          fontSize: '0.75rem',
          padding: '0.2rem 0.55rem',
          borderRadius: 999,
          background: 'rgba(140, 100, 0, 0.12)',
          color: 'var(--text-muted)',
        }}
      >
        отключено
      </span>
    )
  }
  return (
    <span
      style={{
        fontSize: '0.75rem',
        padding: '0.2rem 0.55rem',
        borderRadius: 999,
        background: 'rgba(0, 91, 171, 0.12)',
        color: 'var(--mephi-blue-dark, #004a8f)',
      }}
    >
      доступен
    </span>
  )
}

export function Integrations() {
  const [rows, setRows] = useState<IntegrationCatalogEntry[]>(() => [...INTEGRATIONS_CATALOG])
  const [catalogSource, setCatalogSource] = useState<'api' | 'fallback'>('fallback')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const fromApi = await fetchIntegrationsCatalog()
      if (cancelled) return
      if (fromApi && fromApi.length > 0) {
        setRows(fromApi)
        setCatalogSource('api')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageFrame
      eyebrow="Конфигурация"
      title="Инструменты"
      lead="Каталог сканеров с api-service (`GET /api/v1/integrations`). Если запрос не прошёл — подставляем запасной список из сборки."
      badge="catalog"
    >
      <div className="panel-elevated" style={{ padding: '1rem 1.15rem', maxWidth: 960 }}>
        {loading ? (
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Загружаем каталог…</p>
        ) : null}
        {!loading && catalogSource === 'fallback' ? (
          <p
            className="msg-banner"
            style={{ marginBottom: '0.85rem', borderColor: 'rgba(0, 91, 171, 0.22)', fontSize: '0.85rem' }}
          >
            Каталог с сервера недоступен — показан локальный резерв до восстановления `GET /api/v1/integrations`.
          </p>
        ) : null}
        <div style={{ overflowX: 'auto' }}>
          <table className="data" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>Тип</th>
                <th>Инструмент</th>
                <th>Описание</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{kindLabel(row.kind)}</td>
                  <td>{row.title}</td>
                  <td style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 360 }}>
                    {row.summary.trim() ? row.summary : null}
                    {row.runtime.phase === 'planned' && row.runtime.note ? (
                      <span style={{ display: 'block', marginTop: row.summary.trim() ? 6 : 0 }}>{row.runtime.note}</span>
                    ) : null}
                  </td>
                  <td>{statusBadge(row)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {row.runtime.phase === 'ready' &&
                    row.enabled !== false &&
                    row.runtime.launchAppPath ? (
                      <Link to={row.runtime.launchAppPath} className="btn btn-ghost">
                        Открыть
                      </Link>
                    ) : null}
                    {row.runtime.phase === 'ready' && row.enabled !== false && row.runtime.apiScanPath ? (
                      <code className="mono" style={{ fontSize: '0.72rem', marginLeft: 8, opacity: 0.75 }}>
                        {row.runtime.apiScanPath}
                      </code>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '1rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Дополнительные записи задаёт администратор в консоли управления Atomic Asoc (раздел «Инструменты»). Если у записи указан{' '}
          <code className="mono">scanner_invoke_url</code>, то <code className="mono">POST /api/v1/scans</code> с тем же{' '}
          <code className="mono">scanner_id</code>, что и <code className="mono">id</code>, вызывает этот URL (тело запроса как у встроенных
          сканеров по полям цели). Иначе запись только в каталоге; приём результатов из CI — через{' '}
          <code className="mono">POST /api/v1/findings/ingest</code>.
        </p>
      </div>
    </PageFrame>
  )
}

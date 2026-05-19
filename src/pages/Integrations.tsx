import { Link } from 'react-router-dom'
import { useIntegrationsCatalog } from '../context/IntegrationsCatalogContext'
import type { IntegrationCatalogEntry, IntegrationInputKind } from '../lib/integrationsRegistry'
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

function inputKindLabel(kind: IntegrationInputKind | undefined): string {
  switch (kind) {
    case 'filesystem':
      return 'файловая система'
    case 'lockfile':
      return 'манифест / lockfile'
    case 'http':
      return 'HTTP-цель'
    default:
      return '—'
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
  const { entries: rows, loading, reload } = useIntegrationsCatalog()

  return (
    <PageFrame eyebrow="Конфигурация" title="Инструменты">
      <div className="panel-elevated" style={{ padding: '1rem 1.15rem', width: '100%', maxWidth: 1280 }}>
        <div style={{ marginBottom: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost btn--sm" onClick={() => void reload()} disabled={loading}>
            {loading ? 'Обновление…' : 'Обновить каталог'}
          </button>
          {loading ? (
            <span style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Загружаем каталог…</span>
          ) : null}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data" style={{ minWidth: 960 }}>
            <thead>
              <tr>
                <th>Тип</th>
                <th>Вход</th>
                <th>Имя в processing</th>
                <th>Возможности</th>
                <th>Инструмент</th>
                <th>Описание</th>
                <th>Статус</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{kindLabel(row.kind)}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    {inputKindLabel(row.inputKind)}
                  </td>
                  <td style={{ fontSize: '0.82rem', fontFamily: 'var(--mono, ui-monospace)', wordBreak: 'break-all' }}>
                    {row.scannerName ?? row.id}
                  </td>
                  <td style={{ fontSize: '0.82rem', maxWidth: 200, wordBreak: 'break-word', color: 'var(--text-muted)' }}>
                    {row.capabilities?.length ? row.capabilities.join(', ') : '—'}
                  </td>
                  <td>{row.title}</td>
                  <td style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 400 }}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageFrame>
  )
}

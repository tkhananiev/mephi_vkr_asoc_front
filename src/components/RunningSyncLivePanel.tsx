import type { SyncRunRow } from '../api/types'

function fmt(ts?: string) {
  if (ts == null || ts === '') return '—'
  return String(ts).replace('T', ' ').slice(0, 19)
}

/** Прогоны со статусом running: reference-data время от времени дописывает items_* прямо в БД во время долгих импортов. */
export function RunningSyncLivePanel({
  rows,
  pollSeconds,
}: {
  rows: SyncRunRow[]
  pollSeconds?: number
}) {
  if (!rows.length) return null
  const hint =
    pollSeconds != null
      ? `Пока синк активен, панель и счётчики каталога обновляются примерно раз в ${pollSeconds} с (опрос GET /api/v1/sync/status).`
      : null
  return (
    <div
      style={{
        marginBottom: '1rem',
        padding: '0.65rem 0.85rem',
        borderRadius: 6,
        border: '1px solid rgba(0, 91, 171, 0.28)',
        background: 'rgba(0, 91, 171, 0.06)',
      }}
    >
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.92rem' }}>Сейчас в работе</h3>
      {hint ? (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{hint}</p>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '0.3rem 0.45rem' }}>Источник</th>
              <th style={{ padding: '0.3rem 0.45rem' }}>Статус</th>
              <th style={{ padding: '0.3rem 0.45rem' }}>Обнаружено</th>
              <th style={{ padding: '0.3rem 0.45rem' }}>Обработано</th>
              <th style={{ padding: '0.3rem 0.45rem' }}>Вставлено</th>
              <th style={{ padding: '0.3rem 0.45rem' }}>Обновлено</th>
              <th style={{ padding: '0.3rem 0.45rem' }}>Старт</th>
              <th style={{ padding: '0.3rem 0.45rem' }}>run id</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.25rem 0.45rem' }} className="mono">
                  {row.source_code}
                </td>
                <td style={{ padding: '0.25rem 0.45rem' }}>{row.status}</td>
                <td style={{ padding: '0.25rem 0.45rem' }}>{row.items_discovered ?? '—'}</td>
                <td style={{ padding: '0.25rem 0.45rem' }}>
                  <strong>{row.items_processed ?? '—'}</strong>
                </td>
                <td style={{ padding: '0.25rem 0.45rem' }}>{row.items_inserted ?? '—'}</td>
                <td style={{ padding: '0.25rem 0.45rem' }}>{row.items_updated ?? '—'}</td>
                <td style={{ padding: '0.25rem 0.45rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmt(row.started_at)}</td>
                <td style={{ padding: '0.25rem 0.45rem', color: 'var(--text-muted)' }}>{row.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

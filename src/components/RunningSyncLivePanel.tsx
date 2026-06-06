import type { SyncRunRow } from '../api/types'

function fmt(ts?: string) {
  if (ts == null || ts === '') return '—'
  return String(ts).replace('T', ' ').slice(0, 19)
}

function startedMs(iso?: string): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

function elapsedRunning(startedAt?: string): string {
  const t = startedMs(startedAt)
  if (t == null) return '—'
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (sec < 60) return `${sec} с`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m} мин ${s} с`
}
export function RunningSyncLivePanel({
  rows,
  pollSeconds,
  waitingForRows,
}: {
  rows: SyncRunRow[]
  pollSeconds?: number
waitingForRows?: boolean
}) {
  const stripLive = pollSeconds != null || waitingForRows
  if (!stripLive && rows.length === 0) return null

  const hint =
    pollSeconds != null
      ? `Пока синхронизация активна, этот блок и счётчики каталога опрашиваются примерно раз в ${pollSeconds} с.`
      : waitingForRows
        ? 'Ожидаем появление строки прогона в ответе сервера…'
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
      {stripLive ? (
        <div
          className="sync-progress-track"
          role="progressbar"
          aria-busy="true"
          aria-valuetext="Синхронизация выполняется"
          style={{ marginBottom: rows.length ? '0.65rem' : 0 }}
        >
          <div className="sync-progress-indeterminate" />
        </div>
      ) : null}
      {waitingForRows && rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Строка прогона скоро появится…</p>
      ) : null}
      {rows.length > 0 ? (
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
                <th style={{ padding: '0.3rem 0.45rem' }}>Идёт</th>
                <th style={{ padding: '0.3rem 0.45rem' }}>Старт</th>
                <th style={{ padding: '0.3rem 0.45rem' }}>Ид. прогона</th>
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
                  <td style={{ padding: '0.25rem 0.45rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {row.status === 'running' ? elapsedRunning(row.started_at) : '—'}
                  </td>
                  <td style={{ padding: '0.25rem 0.45rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmt(row.started_at)}</td>
                  <td style={{ padding: '0.25rem 0.45rem', color: 'var(--text-muted)' }}>{row.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

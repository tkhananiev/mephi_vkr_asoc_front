import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createGroupJiraTicket, fetchGroups, patchGroupStatus } from '../api/client'
import type { GroupRow, TicketRow } from '../api/types'
import { GroupRowKebab, type GroupKebabAction } from '../components/GroupRowKebab'
import { PageFrame } from '../layout/PageFrame'
import { severityTone } from '../lib/severityStyle'

export type GroupsBoardView = 'open' | 'false_positive' | 'risk_accepted'

const VIEW_META: Record<
  GroupsBoardView,
  { title: string; lead: string; empty: string; statusQuery: GroupsBoardView }
> = {
  open: {
    title: 'Активные группы',
    lead: 'Открытые группы уязвимостей. Новые находки с тем же ключом остаются здесь, пока вы не закроете группу или не перенесёте в архив.',
    empty: 'Открытых групп нет. Выполните сканирование или проверьте архив.',
    statusQuery: 'open',
  },
  false_positive: {
    title: 'False positive',
    lead: 'Группы, помеченные как ложное срабатывание. В меню ⋮ у строки — «Вернуть в активные».',
    empty: 'Групп с меткой false positive пока нет.',
    statusQuery: 'false_positive',
  },
  risk_accepted: {
    title: 'Risk accepted',
    lead: 'Принятые риски. В меню ⋮ у строки — «Вернуть в активные».',
    empty: 'Групп с меткой risk accepted пока нет.',
    statusQuery: 'risk_accepted',
  },
}

function sevClass(t: ReturnType<typeof severityTone>) {
  switch (t) {
    case 'crit':
      return 'badge sev-crit'
    case 'high':
      return 'badge sev-high'
    case 'med':
      return 'badge sev-med'
    case 'low':
      return 'badge sev-low'
    default:
      return 'badge sev-unk'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'false_positive':
      return 'False positive'
    case 'risk_accepted':
      return 'Risk accepted'
    case 'open':
      return 'Открыта'
    default:
      return status
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'false_positive':
      return 'badge group-status-fp'
    case 'risk_accepted':
      return 'badge group-status-ra'
    default:
      return 'badge group-status-open'
  }
}

type Props = {
  view: GroupsBoardView
}

export function GroupsBoard({ view }: Props) {
  const meta = VIEW_META[view]
  const [rows, setRows] = useState<GroupRow[] | null>(null)
  const [tickets, setTickets] = useState<Record<number, TicketRow>>({})
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setInfo(null)
    const r = await fetchGroups(200, meta.statusQuery)
    setLoading(false)
    if (!r.ok) {
      setRows(null)
      setError(r.error)
      return
    }
    setRows(r.data)
  }, [meta.statusQuery])

  useEffect(() => {
    void load()
  }, [load])

  const kebabActions = useMemo((): GroupKebabAction[] => {
    if (view === 'open') {
      return [
        { id: 'false_positive', label: 'Ложное срабатывание (False positive)' },
        { id: 'risk_accepted', label: 'Принять риск (Risk accepted)' },
        { id: 'jira_fix', label: 'Задача в Jira на исправление' },
      ]
    }
    return [{ id: 'reopen', label: 'Вернуть в активные' }]
  }, [view])

  const runAction = async (groupId: number, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyId(groupId)
    setError(null)
    const r = await action()
    setBusyId(null)
    if (!r.ok) {
      setError(r.error ?? 'Ошибка операции')
      return false
    }
    return true
  }

  const removeRow = (id: number) => {
    setRows((prev) => (prev ? prev.filter((g) => g.id !== id) : prev))
  }

  const handleKebab = async (g: GroupRow, actionId: GroupKebabAction['id']) => {
    if (actionId === 'false_positive') {
      const ok = await runAction(g.id, async () => {
        const r = await patchGroupStatus(g.id, 'false_positive')
        if (!r.ok) return { ok: false, error: r.error }
        return { ok: true }
      })
      if (ok) {
        removeRow(g.id)
        setInfo('Группа перенесена в раздел False positive.')
      }
      return
    }
    if (actionId === 'risk_accepted') {
      const ok = await runAction(g.id, async () => {
        const r = await patchGroupStatus(g.id, 'risk_accepted')
        if (!r.ok) return { ok: false, error: r.error }
        return { ok: true }
      })
      if (ok) {
        removeRow(g.id)
        setInfo('Группа перенесена в раздел Risk accepted.')
      }
      return
    }
    if (actionId === 'jira_fix') {
      const ok = await runAction(g.id, async () => {
        const r = await createGroupJiraTicket(g.id)
        if (!r.ok) return { ok: false, error: r.error }
        setTickets((prev) => ({ ...prev, [g.id]: r.data }))
        return { ok: true }
      })
      if (ok) setInfo('Задача в Jira создана.')
      return
    }
    if (actionId === 'reopen') {
      const ok = await runAction(g.id, async () => {
        const r = await patchGroupStatus(g.id, 'open')
        if (!r.ok) return { ok: false, error: r.error }
        return { ok: true }
      })
      if (ok) {
        removeRow(g.id)
        setInfo('Группа снова в активных.')
      }
    }
  }

  return (
    <PageFrame eyebrow="Операционка" title={meta.title} lead={meta.lead}>
      <nav className="groups-subnav" aria-label="Разделы групп">
        <Link to="/app/groups" className={view === 'open' ? 'groups-subnav-link active' : 'groups-subnav-link'}>
          Активные
        </Link>
        <Link
          to="/app/groups/false-positive"
          className={view === 'false_positive' ? 'groups-subnav-link active' : 'groups-subnav-link'}
        >
          False positive
        </Link>
        <Link
          to="/app/groups/risk-accepted"
          className={view === 'risk_accepted' ? 'groups-subnav-link active' : 'groups-subnav-link'}
        >
          Risk accepted
        </Link>
      </nav>

      <div className="toolbar-row">
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Обновить
        </button>
        {loading ? <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>Загрузка…</span> : null}
      </div>
      {info ? <p className="ok-hint">{info}</p> : null}
      {error ? <p className="err">{error}</p> : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 48 }} />
              <th>ID</th>
              <th>Статус</th>
              <th>Критичность</th>
              <th>Уязвимостей</th>
              <th>Ключ группы</th>
              <th>Правило</th>
              <th>Jira</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && !error ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  …
                </td>
              </tr>
            ) : rows && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  {meta.empty}
                </td>
              </tr>
            ) : (
              rows?.map((g) => {
                const ticket = tickets[g.id]
                const busy = busyId === g.id
                const jiraActions =
                  view === 'open' && ticket
                    ? kebabActions.filter((a) => a.id !== 'jira_fix')
                    : kebabActions
                return (
                  <tr key={g.id}>
                    <td>
                      <GroupRowKebab
                        groupId={g.id}
                        disabled={busy}
                        actions={jiraActions}
                        onSelect={(id) => void handleKebab(g, id)}
                        align="start"
                      />
                    </td>
                    <td>
                      <code style={{ color: 'var(--accent-bright)' }}>{g.id}</code>
                    </td>
                    <td>
                      <span className={statusBadgeClass(g.status)}>{statusLabel(g.status)}</span>
                    </td>
                    <td>
                      <span className={sevClass(severityTone(g.severity_max))}>{g.severity_max}</span>
                    </td>
                    <td>{g.assets_count}</td>
                    <td
                      style={{
                        maxWidth: 420,
                        wordBreak: 'break-all',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {g.group_key}
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>{g.grouping_rule}</span>
                    </td>
                    <td>
                      {ticket ? (
                        <a
                          href={ticket.jira_issue_url}
                          target="_blank"
                          rel="noreferrer"
                          className="group-jira-link"
                        >
                          {ticket.jira_issue_key}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  )
}

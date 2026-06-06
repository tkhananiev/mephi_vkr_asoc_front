import { type CSSProperties, Fragment, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetchScannerCatalogDetail, adminPutIntegrationOverlay } from '../api/client'
import type { IntegrationCatalogApiItem } from '../api/types'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import { markLoginFormWipe } from '../auth/loginFormWipe'
import { PageFrame } from '../layout/PageFrame'

export const SCANNER_KIND_OPTIONS = ['SAST', 'DAST', 'MAST', 'SCA', 'Image Scan'] as const

type AdditionalRow = {
  fields: IntegrationCatalogApiItem
  capsText: string
}

const DEFAULT_GENERIC_RUNNER_URL = 'http://generic-scan-runner:8087/api/v1/run'

const ID_PATTERN = /^[a-z0-9_-]+$/

const KIND_SET = new Set<string>(SCANNER_KIND_OPTIONS)

type AddToolDraft = {
  title: string
  summary: string
  kind: string
  phase: 'ready' | 'planned'
  enabled: boolean
  network_hostname: string
  network_ip: string
  network_port: string
  api_scan_path: string
  scanner_invoke_url: string
  invoke_payload_template: string
  runner_command: string
}

function initialAddDraft(): AddToolDraft {
  return {
    title: '',
    summary: '',
    kind: 'SAST',
    phase: 'ready',
    enabled: true,
    network_hostname: '',
    network_ip: '',
    network_port: '',
    api_scan_path: '/api/v1/scans',
    scanner_invoke_url: DEFAULT_GENERIC_RUNNER_URL,
    invoke_payload_template: '',
    runner_command: '',
  }
}

function isValidScannerInvokeURL(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function capsTextFrom(it: IntegrationCatalogApiItem): string {
  return (it.capabilities ?? []).join(', ')
}

function builtinReadOnlyCell(text: string, mono = false): ReactNode {
  const trimmed = text.trim()
  const s = trimmed === '' ? '—' : trimmed
  return (
    <span
      style={{
        display: 'block',
        maxWidth: 400,
        fontSize: '0.74rem',
        lineHeight: 1.38,
        color: s === '—' ? 'var(--text-muted)' : undefined,
        fontFamily: mono ? 'var(--font-mono, ui-monospace, monospace)' : undefined,
        wordBreak: mono ? 'break-all' : undefined,
      }}
    >
      {s}
    </span>
  )
}
function hydrateNetwork(it: IntegrationCatalogApiItem): IntegrationCatalogApiItem {
  if ((it.network_hostname ?? '').trim() || (it.network_ip ?? '').trim() || (it.network_port ?? '').trim()) return it
  const raw = it.network_host?.trim()
  if (!raw) return it
  return { ...it, network_hostname: raw }
}

function slugifyBase(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || 'tool'
}

function allocateToolId(title: string, builtinIds: Set<string>, rows: AdditionalRow[]): string {
  const used = new Set<string>([...builtinIds, ...rows.map((r) => r.fields.id.trim()).filter(Boolean)])
  const base = slugifyBase(title)
  let candidate = base
  let n = 2
  while (used.has(candidate)) {
    candidate = `${base}-${n}`
    n++
    if (n > 9999) return `${base}-${Math.random().toString(36).slice(2, 10)}`
  }
  return candidate
}

function normalizePayload(fields: IntegrationCatalogApiItem, capsText: string): IntegrationCatalogApiItem {
  const caps = capsText
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const summary = fields.summary.trim() || fields.title.trim() || '-'
  const id = fields.id.trim()
  const sn = (fields.scanner_name?.trim() || id) || undefined
  const rc = fields.runner_command?.trim() ?? ''
  return {
    ...fields,
    id,
    summary,
    scanner_name: sn,
    scanner_invoke_url: fields.scanner_invoke_url?.trim() || undefined,
    runner_command: rc || undefined,
    api_scan_path: fields.api_scan_path?.trim() || undefined,
    network_hostname: fields.network_hostname?.trim() || undefined,
    network_ip: fields.network_ip?.trim() || undefined,
    network_port: fields.network_port?.trim() || undefined,
    network_host: fields.network_host?.trim() || undefined,
    invoke_hint: fields.invoke_hint?.trim() || undefined,
    invoke_payload_template: fields.invoke_payload_template?.trim() || undefined,
    capabilities: caps.length ? caps : undefined,
    console_path: fields.console_path?.trim() || '',
  }
}

function validateRows(builtinIds: Set<string>, rows: AdditionalRow[]): string[] {
  const errs: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const it = normalizePayload(row.fields, row.capsText)
    const n = i + 1
    const id = it.id.trim()
    if (!id) {
      errs.push(`Строка ${n}: отсутствует внутренний id — сохраните каталог заново или удалите строку.`)
      continue
    }
    if (!ID_PATTERN.test(id)) {
      errs.push(`Строка ${n}: id «${id}» — только строчные латинские буквы, цифры, дефис и подчёркивание.`)
      continue
    }
    if (builtinIds.has(id)) {
      errs.push(`Строка ${n}: id «${id}» зарезервирован встроенным сканером.`)
      continue
    }
    if (seen.has(id)) {
      errs.push(`Строка ${n}: повторяющийся id «${id}».`)
      continue
    }
    seen.add(id)

    const kind = it.kind.trim()
    if (!KIND_SET.has(kind)) {
      errs.push(`Строка ${n}: тип инструмента должен быть одним из: ${SCANNER_KIND_OPTIONS.join(', ')}.`)
    }
    const phase = it.phase.trim().toLowerCase()
    if (phase !== 'ready' && phase !== 'planned') {
      errs.push(`Строка ${n}: phase — ready или planned.`)
    }
    const ik = it.input_kind.trim().toLowerCase()
    if (!['filesystem', 'lockfile', 'http'].includes(ik)) {
      errs.push(`Строка ${n}: input_kind — filesystem, lockfile или http.`)
    }
    if (!it.title.trim()) errs.push(`Строка ${n}: заполните название.`)

    const rc = it.runner_command?.trim() ?? ''
    const inv = it.scanner_invoke_url?.trim() ?? ''
    if (rc !== '' && inv === '') {
      errs.push(`Строка ${n}: если задана shell-команда — укажите URL POST.`)
    }
    if (inv !== '' && !isValidScannerInvokeURL(inv)) {
      errs.push(`Строка ${n}: scanner_invoke_url — корректный http(s) URL.`)
    }

    if (phase === 'ready' && !(it.scanner_name?.trim() ?? it.id.trim())) {
      errs.push(`Строка ${n}: для phase «ready» нужен scanner_name (заполняется автоматически из id).`)
    }
  }
  return errs
}

async function persistAdditional(rows: AdditionalRow[], builtinIds: Set<string>): Promise<{ ok: true } | { ok: false; error: string }> {
  const localErrs = validateRows(builtinIds, rows)
  if (localErrs.length > 0) {
    return { ok: false, error: localErrs.join(' ') }
  }
  const payload = rows.map((row) => normalizePayload(row.fields, row.capsText))
  return adminPutIntegrationOverlay(payload)
}

export function AdminScannerCatalog() {
  const nav = useNavigate()
  const [builtinIds, setBuiltinIds] = useState<Set<string>>(new Set())
const [builtinCatalog, setBuiltinCatalog] = useState<IntegrationCatalogApiItem[]>([])
  const [additional, setAdditional] = useState<AdditionalRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addDraft, setAddDraft] = useState<AddToolDraft>(initialAddDraft)
  const [addErr, setAddErr] = useState<string | null>(null)

  const draftErrors = useMemo(() => validateRows(builtinIds, additional), [builtinIds, additional])

  const load = useCallback(
    async (opts?: { keepMsg?: boolean }) => {
      setErr(null)
      if (!opts?.keepMsg) {
        setMsg(null)
      }
      const r = await adminFetchScannerCatalogDetail()
      if (!r.ok) {
        if (/\b403\b/.test(r.error) || /forbidden/i.test(r.error)) {
          localStorage.removeItem(ADMIN_TOKEN_KEY)
          markLoginFormWipe()
          nav({ pathname: '/', search: '?auth=login' }, { replace: true, state: { freshLogin: true } })
          return
        }
        setErr(r.error)
        setBuiltinCatalog([])
        return
      }
      const bi = new Set<string>()
      const builtinRows: IntegrationCatalogApiItem[] = []
      const add: AdditionalRow[] = []
      for (const e of r.entries) {
        if (e.source === 'builtin') {
          const id = e.integration.id.trim()
          bi.add(id)
          builtinRows.push(hydrateNetwork({ ...e.integration }))
        } else {
          add.push({ fields: hydrateNetwork({ ...e.integration }), capsText: capsTextFrom(e.integration) })
        }
      }
      builtinRows.sort((a, b) => a.id.localeCompare(b.id))
      setBuiltinIds(bi)
      setBuiltinCatalog(builtinRows)
      setAdditional(add.length ? add : [])
    },
    [nav],
  )

  useEffect(() => {
    void load()
  }, [load])

  function patchDraft(i: number, patch: Partial<IntegrationCatalogApiItem>) {
    setAdditional((prev) =>
      prev.map((row, j) => (j === i ? { ...row, fields: { ...row.fields, ...patch } } : row)),
    )
  }

  function patchCaps(i: number, capsText: string) {
    setAdditional((prev) => prev.map((row, j) => (j === i ? { ...row, capsText } : row)))
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const localErrs = validateRows(builtinIds, additional)
    if (localErrs.length > 0) {
      setErr(localErrs.join(' '))
      return
    }
    setBusy(true)
    const r = await persistAdditional(additional, builtinIds)
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    setMsg('Сохранено.')
    await load({ keepMsg: true })
  }

  async function deleteRow(idx: number) {
    const row = additional[idx]
    if (!row) return
    const label = row.fields.title.trim() || row.fields.id
    if (!window.confirm(`Удалить инструмент «${label}»? Запись будет удалена из каталога (файл overlay на сервере).`)) {
      return
    }
    setErr(null)
    setMsg(null)
    const next = additional.filter((_, j) => j !== idx)
    setAdditional(next)
    setBusy(true)
    const r = await persistAdditional(next, builtinIds)
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      await load()
      return
    }
    setMsg('Инструмент удалён.')
    await load({ keepMsg: true })
  }

  function appendToolFromForm() {
    setAddErr(null)
    const title = addDraft.title.trim()
    if (!title) {
      setAddErr('Укажите имя инструмента.')
      return
    }

    const id = allocateToolId(title, builtinIds, additional)
    const scanner_invoke_url = addDraft.scanner_invoke_url.trim()
    const runner_command = addDraft.runner_command.trim()
    if (runner_command && !scanner_invoke_url) {
      setAddErr('Если указана shell-команда — задайте URL POST (часто URL универсального раннера).')
      return
    }
    if (scanner_invoke_url && !isValidScannerInvokeURL(scanner_invoke_url)) {
      setAddErr('Некорректный URL POST.')
      return
    }

    const phase = addDraft.phase
    if (phase === 'ready' && !id) {
      setAddErr('Не удалось сформировать id.')
      return
    }

    const cp = addDraft.enabled ? `/app/scan/${id}` : ''
    const fields: IntegrationCatalogApiItem = {
      id,
      kind: addDraft.kind,
      title,
      summary: addDraft.summary.trim() || title,
      phase,
      enabled: addDraft.enabled,
      input_kind: 'filesystem',
      scanner_name: id,
      api_scan_path: addDraft.api_scan_path.trim() || '/api/v1/scans',
      console_path: cp,
      note: '',
      network_hostname: addDraft.network_hostname.trim(),
      network_ip: addDraft.network_ip.trim(),
      network_port: addDraft.network_port.trim(),
      scanner_invoke_url: scanner_invoke_url || undefined,
      invoke_payload_template: addDraft.invoke_payload_template.trim() || undefined,
      runner_command: runner_command || undefined,
      invoke_hint: undefined,
      network_host: '',
    }

    setAdditional((prev) => [...prev, { fields, capsText: '' }])
    setAddDraft(initialAddDraft())
    setAddErr(null)
    setMsg('Строка добавлена в таблицу. Не забудьте нажать «Сохранить», чтобы записать каталог на сервер.')
  }

  const cellStyle: CSSProperties = {
    verticalAlign: 'top',
    padding: '6px',
    borderBottom: '1px solid var(--border-subtle)',
    fontSize: '0.78rem',
  }

  const thStyle: CSSProperties = {
    textAlign: 'left',
    padding: '8px 6px',
    fontSize: '0.74rem',
    fontWeight: 600,
    borderBottom: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap',
  }

  return (
    <PageFrame eyebrow="Администрирование инструментов" title="Инструменты">
      <div style={{ maxWidth: 1520, width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {err ? (
          <p className="err" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }} role="status">
            {msg}
          </p>
        ) : null}

        {additional.length > 0 && draftErrors.length > 0 ? (
          <div className="card" style={{ padding: '0.65rem 0.85rem', borderLeft: '4px solid #c0392b' }} role="status">
            <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>Исправьте перед сохранением</div>
            <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.82rem', lineHeight: 1.55 }}>
              {draftErrors.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form onSubmit={onSave} className="card panel-elevated" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={() => setAddOpen((o) => !o)}>
              {addOpen ? 'Скрыть форму' : 'Добавить инструмент'}
            </button>
            <button type="submit" className="btn btn-ghost" disabled={busy || draftErrors.length > 0}>
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
            {draftErrors.length > 0 ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Сохранение недоступно, пока есть ошибки.</span>
            ) : null}
          </div>

          {addOpen ? (
            <section
              className="card"
              style={{
                padding: '0.85rem 1rem',
                marginBottom: '0.85rem',
                border: '1px solid var(--border-subtle)',
              }}
              aria-labelledby="add-tool-heading"
            >
              <h3 id="add-tool-heading" style={{ margin: '0 0 0.65rem', fontSize: '0.98rem' }}>
                Новый инструмент
              </h3>
              {addErr ? (
                <p className="err" role="alert" style={{ marginTop: 0 }}>
                  {addErr}
                </p>
              ) : null}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '0.55rem',
                  marginBottom: '0.65rem',
                }}
              >
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Имя инструмента *
                  <input
                    className="input"
                    value={addDraft.title}
                    onChange={(e) => setAddDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Semgrep / свой сканер"
                  />
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Описание
                  <input
                    className="input"
                    value={addDraft.summary}
                    onChange={(e) => setAddDraft((d) => ({ ...d, summary: e.target.value }))}
                    placeholder="кратко для каталога"
                  />
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Тип / класс *
                  <select className="input" value={addDraft.kind} onChange={(e) => setAddDraft((d) => ({ ...d, kind: e.target.value }))}>
                    {SCANNER_KIND_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  phase
                  <select
                    className="input"
                    value={addDraft.phase}
                    onChange={(e) => setAddDraft((d) => ({ ...d, phase: e.target.value as AddToolDraft['phase'] }))}
                  >
                    <option value="ready">ready</option>
                    <option value="planned">planned</option>
                  </select>
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                  <span style={{ marginTop: 16 }}>вкл.</span>
                  <input
                    type="checkbox"
                    checked={addDraft.enabled}
                    onChange={(e) => setAddDraft((d) => ({ ...d, enabled: e.target.checked }))}
                  />
                </label>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '0.55rem',
                  marginBottom: '0.65rem',
                }}
              >
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Сетевое имя хоста
                  <input className="input" value={addDraft.network_hostname} onChange={(e) => setAddDraft((d) => ({ ...d, network_hostname: e.target.value }))} />
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  IP-адрес
                  <input className="input" value={addDraft.network_ip} onChange={(e) => setAddDraft((d) => ({ ...d, network_ip: e.target.value }))} />
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Порт
                  <input className="input" value={addDraft.network_port} onChange={(e) => setAddDraft((d) => ({ ...d, network_port: e.target.value }))} />
                </label>
                <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Путь до API (напр. scans)
                  <input className="input" value={addDraft.api_scan_path} onChange={(e) => setAddDraft((d) => ({ ...d, api_scan_path: e.target.value }))} />
                </label>
              </div>
              <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '0.55rem' }}>
                URL POST запуска — полный адрес метода{' '}
                <span className="hint">если команда shell передаётся в теле POST, опишите формат в поле ниже</span>
                <textarea
                  className="input"
                  rows={2}
                  style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.72rem' }}
                  value={addDraft.scanner_invoke_url}
                  onChange={(e) => setAddDraft((d) => ({ ...d, scanner_invoke_url: e.target.value }))}
                  spellCheck={false}
                />
              </label>
              <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '0.55rem' }}>
                Тело POST (JSON-шаблон, поля, пример){' '}
                <textarea
                  className="input"
                  rows={3}
                  style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.72rem' }}
                  value={addDraft.invoke_payload_template}
                  onChange={(e) => setAddDraft((d) => ({ ...d, invoke_payload_template: e.target.value }))}
                  spellCheck={false}
                  placeholder='например: {"scanner":"…","shell":"…"}'
                />
              </label>
              <label style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '0.55rem' }}>
                Shell-команда для универсального исполнителя{' '}
                <span className="hint">
                  необязательна, если метод POST сам выполняет скан без shell; иначе плейсхолдеры <code className="mono">{`{target_path}`}</code>,{' '}
                  <code className="mono">{`{git_repository_url}`}</code>
                </span>
                <textarea
                  className="input"
                  rows={3}
                  style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.72rem' }}
                  value={addDraft.runner_command}
                  onChange={(e) => setAddDraft((d) => ({ ...d, runner_command: e.target.value }))}
                  spellCheck={false}
                />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button type="button" className="btn btn-primary" onClick={() => appendToolFromForm()}>
                  Добавить в таблицу
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddDraft(initialAddDraft())}>
                  Очистить форму
                </button>
              </div>
            </section>
          ) : null}

          <div className="admin-scanner-table-wrap" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="data" style={{ minWidth: 1040, borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={thStyle} />
                  <th style={thStyle}>Название</th>
                  <th style={thStyle}>Описание</th>
                  <th style={thStyle}>Тип</th>
                  <th style={thStyle}>Маршрут в консоли</th>
                  <th style={thStyle}>Адрес вызова</th>
                  <th style={thStyle}>Тело запроса</th>
                  <th style={thStyle}>Команда оболочки</th>
                  <th style={thStyle}>Фаза</th>
                  <th style={thStyle}>Вкл.</th>
                </tr>
              </thead>
              <tbody>
                {builtinCatalog.map((row) => (
                  <Fragment key={`builtin-${row.id}`}>
                    <tr style={{ background: 'rgba(0, 91, 171, 0.045)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={cellStyle}>
                        <span className="badge" style={{ fontSize: '0.65rem' }}>
                          встроено
                        </span>
                      </td>
                      <td style={cellStyle}>
                        <strong style={{ fontSize: '0.8rem' }}>{row.title}</strong>
                        <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>
                          <code>{row.id}</code>
                          {(row.capabilities?.length ?? 0) > 0 ? <> · {(row.capabilities ?? []).join(', ')}</> : null}
                        </div>
                      </td>
                      <td style={cellStyle}>{builtinReadOnlyCell(row.summary.trim() ? row.summary : row.title)}</td>
                      <td style={cellStyle}>{row.kind}</td>
                      <td style={cellStyle}>{builtinReadOnlyCell(row.api_scan_path ?? '', true)}</td>
                      <td style={cellStyle}>{builtinReadOnlyCell(row.scanner_invoke_url ?? '', true)}</td>
                      <td style={cellStyle}>{builtinReadOnlyCell(row.invoke_payload_template ?? '', true)}</td>
                      <td style={cellStyle}>{builtinReadOnlyCell(row.runner_command ?? '', true)}</td>
                      <td style={cellStyle}>{row.phase}</td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <input type="checkbox" checked={row.enabled} disabled aria-label={`${row.title} включён`} />
                      </td>
                    </tr>
                  </Fragment>
                ))}
                {additional.map((row, i) => (
                  <Fragment key={`${row.fields.id}:${i}`}>
                    <tr>
                      <td style={cellStyle}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ color: 'var(--danger)' }}
                          disabled={busy}
                          onClick={() => void deleteRow(i)}
                        >
                          Удалить
                        </button>
                      </td>
                      <td style={cellStyle}>
                        <input className="input" style={{ minWidth: 120 }} value={row.fields.title} onChange={(e) => patchDraft(i, { title: e.target.value })} />
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="input"
                          style={{ minWidth: 140 }}
                          value={row.fields.summary}
                          onChange={(e) => patchDraft(i, { summary: e.target.value })}
                          placeholder={row.fields.title || '…'}
                        />
                      </td>
                      <td style={cellStyle}>
                        <select className="input" value={row.fields.kind} onChange={(e) => patchDraft(i, { kind: e.target.value })}>
                          {SCANNER_KIND_OPTIONS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="input"
                          style={{ minWidth: 96 }}
                          value={row.fields.api_scan_path ?? ''}
                          onChange={(e) => patchDraft(i, { api_scan_path: e.target.value })}
                        />
                      </td>
                      <td style={cellStyle}>
                        <textarea
                          className="input"
                          rows={2}
                          style={{ minWidth: 200, resize: 'vertical', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.72rem' }}
                          value={row.fields.scanner_invoke_url ?? ''}
                          onChange={(e) => patchDraft(i, { scanner_invoke_url: e.target.value })}
                          placeholder={DEFAULT_GENERIC_RUNNER_URL}
                          spellCheck={false}
                        />
                      </td>
                      <td style={cellStyle}>
                        <textarea
                          className="input"
                          rows={2}
                          style={{ minWidth: 160, resize: 'vertical', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.72rem' }}
                          value={row.fields.invoke_payload_template ?? ''}
                          onChange={(e) => patchDraft(i, { invoke_payload_template: e.target.value })}
                          spellCheck={false}
                        />
                      </td>
                      <td style={cellStyle}>
                        <textarea
                          className="input"
                          rows={3}
                          style={{ minWidth: 180, resize: 'vertical', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.72rem' }}
                          value={row.fields.runner_command ?? ''}
                          onChange={(e) => patchDraft(i, { runner_command: e.target.value })}
                          spellCheck={false}
                          placeholder={`например: echo '[{{"severity":"high",...}}]'`}
                        />
                      </td>
                      <td style={cellStyle}>
                        <select
                          className="input"
                          value={row.fields.phase}
                          onChange={(e) => patchDraft(i, { phase: e.target.value as IntegrationCatalogApiItem['phase'] })}
                        >
                          <option value="ready">ready</option>
                          <option value="planned">planned</option>
                        </select>
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={row.fields.enabled}
                          onChange={(e) => {
                            const en = e.target.checked
                            patchDraft(i, {
                              enabled: en,
                              console_path: en ? (row.fields.console_path?.trim() || `/app/scan/${row.fields.id}`) : '',
                            })
                          }}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={10} style={{ ...cellStyle, background: 'var(--panel-muted, rgba(0,0,0,0.03))', borderBottom: '1px solid var(--border-subtle)' }}>
                        <details>
                          <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: '0.78rem' }}>
                            Сеть и доп. поля (внутренний id:{' '}
                            <code className="mono" style={{ fontSize: '0.74rem' }}>
                              {row.fields.id}
                            </code>
                            )
                          </summary>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                              gap: '0.45rem',
                              marginTop: 8,
                            }}
                          >
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              Сетевое имя хоста
                              <input
                                className="input"
                                value={row.fields.network_hostname ?? ''}
                                onChange={(e) => patchDraft(i, { network_hostname: e.target.value })}
                              />
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              IP-адрес
                              <input className="input" value={row.fields.network_ip ?? ''} onChange={(e) => patchDraft(i, { network_ip: e.target.value })} />
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              Порт
                              <input className="input" value={row.fields.network_port ?? ''} onChange={(e) => patchDraft(i, { network_port: e.target.value })} />
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              Сводка сети (legacy)
                              <input className="input" value={row.fields.network_host ?? ''} onChange={(e) => patchDraft(i, { network_host: e.target.value })} />
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              input_kind
                              <select className="input" value={row.fields.input_kind} onChange={(e) => patchDraft(i, { input_kind: e.target.value })}>
                                <option value="filesystem">filesystem</option>
                                <option value="lockfile">lockfile</option>
                                <option value="http">http</option>
                              </select>
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              scanner_name <span className="hint">по умолчанию совпадает с id</span>
                              <input
                                className="input"
                                style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.72rem' }}
                                value={row.fields.scanner_name ?? ''}
                                onChange={(e) => patchDraft(i, { scanner_name: e.target.value })}
                              />
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              console_path
                              <input className="input" value={row.fields.console_path ?? ''} onChange={(e) => patchDraft(i, { console_path: e.target.value })} />
                            </label>
                            <label style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              capabilities
                              <input className="input" value={row.capsText} onChange={(e) => patchCaps(i, e.target.value)} placeholder="через запятую" />
                            </label>
                            <label style={{ fontSize: '0.72rem', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              note
                              <input className="input" value={row.fields.note ?? ''} onChange={(e) => patchDraft(i, { note: e.target.value })} />
                            </label>
                            <label style={{ fontSize: '0.72rem', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              invoke_hint
                              <input className="input" value={row.fields.invoke_hint ?? ''} onChange={(e) => patchDraft(i, { invoke_hint: e.target.value })} />
                            </label>
                          </div>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {additional.length === 0 ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Свои сканеры — кнопка «Добавить инструмент», затем «Сохранить» (пишется в overlay).
            </p>
          ) : null}
        </form>
      </div>
    </PageFrame>
  )
}

import { TOKEN_KEY } from '../auth/token'
import { ADMIN_TOKEN_KEY } from '../auth/adminToken'
import type {
  AdminIntegrationCatalogEntryDTO,
  CatalogStatusResponse,
  GroupRow,
  TicketRow,
  IntegrationsListResponse,
  IntegrationCatalogApiItem,
  PassportResponse,
  ScanRequestBody,
  UnifiedScanRequestBody,
  SyncRunRow,
  VulnerabilityReportRow,
} from './types'
import { integrationsFromApiResponse, type IntegrationCatalogEntry } from '../lib/integrationsRegistry'

async function parseJSON<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const t = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  let path = ''
  if (typeof input === 'string') path = input
  else if (input instanceof URL) path = input.pathname + input.search
  else path = new URL(input.url, 'http://localhost').pathname + new URL(input.url, 'http://localhost').search

  if (t && path.includes('/api/') && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${t}`)
  }
  return fetch(input, { ...init, headers })
}
export async function login(
  identifier: string,
  password: string,
): Promise<
  | { ok: true; token: string; role: 'user' | 'admin' }
  | { ok: false; error: string }
> {
  const id = identifier.trim()
  const res = await fetch('/auth/v1/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: id, password }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<{ access_token?: string; role?: string }>(res)
  const token = data.access_token ?? ''
  if (!token) return { ok: false, error: 'no token in response' }
  const role = data.role === 'admin' ? 'admin' : 'user'
  return { ok: true, token, role }
}

export type RegisterPayload = {
  first_name: string
  last_name: string
  patronymic?: string
  username: string
  email: string
  password: string
}

export async function requestRegistrationCode(
  body: RegisterPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/auth/v1/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: body.first_name,
      last_name: body.last_name,
      patronymic: body.patronymic ?? '',
      username: body.username,
      email: body.email,
      password: body.password,
    }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function verifyRegistrationCode(
  email: string,
  code: string,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const res = await fetch('/auth/v1/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<{ id?: number }>(res)
  if (data.id == null) return { ok: false, error: 'no id in response' }
  return { ok: true, id: data.id }
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const t = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  if (t && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${t}`)
  return fetch(path, { ...init, headers })
}
export async function adminApiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const t = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  let path = ''
  if (typeof input === 'string') path = input
  else if (input instanceof URL) path = input.pathname + input.search
  else path = new URL(input.url, 'http://localhost').pathname + new URL(input.url, 'http://localhost').search

  if (t && path.includes('/api/') && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${t}`)
  }
  return fetch(input, { ...init, headers })
}

export type AdminAccountRow =
  | {
      kind: 'user'
      stable_id: string
      id: number
      email: string
      username: string
      first_name: string
      last_name: string
      patronymic: string
      display_name: string
      disabled: boolean
      created_at: string
    }
  | {
      kind: 'admin'
      stable_id: string
      id: number
      login: string
      disabled: boolean
      created_at: string
    }

function parseAdminAccountRow(x: {
  kind?: unknown
  stable_id?: unknown
  id?: unknown
  email?: unknown
  username?: unknown
  first_name?: unknown
  last_name?: unknown
  patronymic?: unknown
  display_name?: unknown
  login?: unknown
  disabled?: unknown
  created_at?: unknown
}): AdminAccountRow | null {
  if (x.kind !== 'user' && x.kind !== 'admin') return null
  const id = typeof x.id === 'number' ? x.id : null
  if (id == null) return null
  let stable =
    typeof x.stable_id === 'string' && x.stable_id.trim() !== ''
      ? x.stable_id.trim()
      : x.kind === 'user'
        ? `CU-${id}`
        : `ADM-${id}`
  const disabled = typeof x.disabled === 'boolean' ? x.disabled : false
  const created_at = typeof x.created_at === 'string' ? x.created_at : ''
  if (x.kind === 'user') {
    const email = typeof x.email === 'string' ? x.email : ''
    const username = typeof x.username === 'string' ? x.username : ''
    const first_name = typeof x.first_name === 'string' ? x.first_name : ''
    const last_name = typeof x.last_name === 'string' ? x.last_name : ''
    const patronymic = typeof x.patronymic === 'string' ? x.patronymic : ''
    const display_name = typeof x.display_name === 'string' ? x.display_name : ''
    return {
      kind: 'user',
      stable_id: stable,
      id,
      email,
      username,
      first_name,
      last_name,
      patronymic,
      display_name,
      disabled,
      created_at,
    }
  }
  const login = typeof x.login === 'string' ? x.login : ''
  return { kind: 'admin', stable_id: stable, id, login, disabled, created_at }
}

export async function adminListAccounts(): Promise<
  | { ok: true; accounts: AdminAccountRow[] }
  | { ok: false; error: string; unauthorized?: boolean }
> {
  const res = await adminFetch('/auth/v1/admin/users')
  if (res.status === 401) {
    return { ok: false, error: 'Требуется вход', unauthorized: true }
  }
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<{ accounts?: unknown[] }>(res)
  const raw = data.accounts ?? []
  const accounts: AdminAccountRow[] = []
  for (const row of raw) {
    if (row && typeof row === 'object') {
      const p = parseAdminAccountRow(row as Record<string, unknown>)
      if (p) accounts.push(p)
    }
  }
  return { ok: true, accounts }
}

export async function adminCreateAccount(
  payload:
    | {
        role: 'user'
        email: string
        username: string
        first_name: string
        last_name: string
        patronymic?: string
        password: string
      }
    | { role: 'admin'; login: string; password: string },
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const body =
    payload.role === 'user'
      ? {
          role: payload.role,
          email: payload.email,
          username: payload.username.trim(),
          first_name: payload.first_name,
          last_name: payload.last_name,
          patronymic: (payload.patronymic ?? '').trim(),
          password: payload.password,
        }
      : { role: payload.role, login: payload.login, password: payload.password }
  const res = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<{ id?: number }>(res)
  if (data.id == null) return { ok: false, error: 'no id in response' }
  return { ok: true, id: data.id }
}

export async function adminPatchConsoleUser(
  id: number,
  patch: { email?: string; disabled?: boolean; display_name?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/console-users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminPatchAdmin(
  id: number,
  patch: { login?: string; disabled?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/admins/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminResetConsoleUserPassword(
  id: number,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/console-users/${id}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminResetAdminPassword(
  id: number,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/admins/${id}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminDeleteConsoleUser(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/console-users/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminDeleteAdmin(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/admins/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminPromoteUserToAdmin(
  id: number,
  loginHint?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/console-users/${id}/promote-to-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginHint && loginHint.trim() !== '' ? { login: loginHint.trim() } : {}),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminDemoteAdminToUser(
  id: number,
  body: {
    email: string
    username: string
    first_name: string
    last_name: string
    patronymic?: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/auth/v1/admin/admins/${id}/demote-to-console-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: body.email.trim(),
      username: body.username.trim(),
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      patronymic: (body.patronymic ?? '').trim(),
    }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}
export async function adminDockerLogs(
  serviceId: string,
  tail = 200,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const q = new URLSearchParams({ service: serviceId, tail: String(tail) })
  const res = await adminApiFetch(`/api/v1/admin/ops/docker/logs?${q.toString()}`)
  const text = await res.text()
  if (!res.ok) {
    try {
      const j = JSON.parse(text) as { error?: string }
      if (j.error) return { ok: false, error: j.error }
    } catch {
      /* не JSON */
    }
    return { ok: false, error: text.trim() || `HTTP ${res.status}` }
  }
  return { ok: true, text }
}

export async function adminDockerRestart(
  serviceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminApiFetch('/api/v1/admin/ops/docker/restart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: serviceId }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function adminFetchScannerCatalogDetail(): Promise<
  | { ok: true; entries: AdminIntegrationCatalogEntryDTO[]; overlay_persistent: boolean }
  | { ok: false; error: string }
> {
  const res = await adminApiFetch('/api/v1/admin/integrations')
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<{ entries?: AdminIntegrationCatalogEntryDTO[]; overlay_persistent?: boolean }>(res)
  if (!data.entries || !Array.isArray(data.entries)) {
    return { ok: false, error: 'invalid admin integrations payload' }
  }
  return { ok: true, entries: data.entries, overlay_persistent: Boolean(data.overlay_persistent) }
}

export async function adminPutIntegrationOverlay(
  additional: IntegrationCatalogApiItem[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminApiFetch('/api/v1/admin/integrations', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ additional }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}
export async function fetchIntegrationsCatalog(): Promise<IntegrationCatalogEntry[] | null> {
  try {
    const res = await apiFetch('/api/v1/integrations')
    if (!res.ok) return null
    const data = await parseJSON<IntegrationsListResponse>(res)
    if (!data?.integrations || !Array.isArray(data.integrations)) return null
    return integrationsFromApiResponse(data)
  } catch {
    return null
  }
}

export type ScanScenarioResult = { ok: true; data: PassportResponse } | { ok: false; error: string }
export async function runScanForApiPath(
  apiScanPath: string | undefined,
  scannerId: string,
  body: ScanRequestBody,
): Promise<ScanScenarioResult> {
  const path = (apiScanPath ?? '').trim()
  switch (path) {
    case '/api/v1/scans/gitleaks':
      return runGitleaksScenario(scannerId, body)
    case '/api/v1/scans/sca':
      return runScaScenario(scannerId, body)
    case '/api/v1/scans/dast':
      return runDastScenario(scannerId, body)
    case '/api/v1/scans':
    case '':
      return runUnifiedScanScenario(scannerId, body)
    default:
      if (path.startsWith('/api/v1/scans')) {
        const res = await apiFetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
          return { ok: false, error: err.error ?? `HTTP ${res.status}` }
        }
        const data = await parseJSON<PassportResponse>(res)
        return { ok: true, data }
      }
      return runUnifiedScanScenario(scannerId, body)
  }
}
export async function runUnifiedScanScenario(
  scannerId: string,
  body: ScanRequestBody,
): Promise<{ ok: true; data: PassportResponse } | { ok: false; error: string }> {
  const payload: UnifiedScanRequestBody = { scanner_id: scannerId, ...body }
  const res = await apiFetch('/api/v1/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<PassportResponse>(res)
  return { ok: true, data }
}
export async function runGitleaksScenario(
  _scannerId: string,
  body: ScanRequestBody,
): Promise<{ ok: true; data: PassportResponse } | { ok: false; error: string }> {
  const res = await apiFetch('/api/v1/scans/gitleaks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<PassportResponse>(res)
  return { ok: true, data }
}

export async function runScaScenario(
  _scannerId: string,
  body: ScanRequestBody,
): Promise<{ ok: true; data: PassportResponse } | { ok: false; error: string }> {
  const res = await apiFetch('/api/v1/scans/sca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<PassportResponse>(res)
  return { ok: true, data }
}

export async function runDastScenario(
  _scannerId: string,
  body: ScanRequestBody,
): Promise<{ ok: true; data: PassportResponse } | { ok: false; error: string }> {
  const res = await apiFetch('/api/v1/scans/dast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<PassportResponse>(res)
  return { ok: true, data }
}
export async function runSemgrepScenario(
  body: ScanRequestBody,
): Promise<{ ok: true; data: PassportResponse } | { ok: false; error: string }> {
  return runUnifiedScanScenario('semgrep', body)
}

export type GroupsListStatus = 'open' | 'false_positive' | 'risk_accepted' | 'all'

export async function fetchGroups(
  limit = 50,
  status: GroupsListStatus = 'open',
): Promise<{ ok: true; data: GroupRow[] } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/v1/groups?limit=${limit}&status=${encodeURIComponent(status)}`)
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<GroupRow[]>(res)
  return { ok: true, data }
}

export type GroupClosureStatus = 'open' | 'false_positive' | 'risk_accepted'

export async function patchGroupStatus(
  groupId: number,
  status: GroupClosureStatus,
): Promise<{ ok: true; data: GroupRow } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/v1/groups/${groupId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<GroupRow>(res)
  return { ok: true, data }
}

export async function createGroupJiraTicket(
  groupId: number,
): Promise<{ ok: true; data: TicketRow } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/v1/groups/${groupId}/jira-ticket`, { method: 'POST' })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<TicketRow>(res)
  return { ok: true, data }
}
export type CatalogSyncPostPath =
  | '/api/v1/sync/bdu'
  | '/api/v1/sync/bdu/bulk'
  | '/api/v1/sync/nvd'
  | '/api/v1/sync/all'

export async function postSync(
  path: CatalogSyncPostPath,
  query = '',
): Promise<{ ok: true; status: number } | { ok: false; error: string }> {
  const res = await apiFetch(path + query, { method: 'POST' })
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  return { ok: true, status: res.status }
}

export async function fetchSyncRuns(
  limit = 15,
): Promise<{ ok: true; data: SyncRunRow[] } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/v1/sync/runs?limit=${limit}`)
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` }
  }
  const data = await parseJSON<SyncRunRow[]>(res)
  return { ok: true, data }
}

export async function fetchCatalogStatus(): Promise<
  { ok: true; data: CatalogStatusResponse } | { ok: false; error: string }
> {
  const res = await apiFetch('/api/v1/sync/status')
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` }
  }
  const data = await parseJSON<CatalogStatusResponse>(res)
  return { ok: true, data }
}

export async function postSyncAsAdmin(
  path: CatalogSyncPostPath,
  query = '',
): Promise<
  | { ok: true; status: number; hint?: string }
  | { ok: false; error: string; status: number }
> {
  const res = await adminApiFetch(path + query, { method: 'POST' })
  const text = await res.text()
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = JSON.parse(text) as { error?: string }
      if (typeof j.error === 'string' && j.error.trim()) msg = j.error.trim()
    } catch {
      const trimmed = text.trim()
      if (trimmed) msg = trimmed.slice(0, 240)
    }
    return { ok: false, error: msg, status: res.status }
  }
  let hint: string | undefined
  try {
    const j = JSON.parse(text) as { hint?: string }
    if (typeof j.hint === 'string' && j.hint.trim()) hint = j.hint.trim()
  } catch {
    /* ответ может быть телом SyncResult — без поля hint */
  }
  return { ok: true, status: res.status, hint }
}

export async function fetchSyncRunsAsAdmin(
  limit = 15,
): Promise<{ ok: true; data: SyncRunRow[] } | { ok: false; error: string }> {
  const res = await adminApiFetch(`/api/v1/sync/runs?limit=${limit}`)
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` }
  }
  const data = await parseJSON<SyncRunRow[]>(res)
  return { ok: true, data }
}

export async function fetchCatalogStatusAsAdmin(): Promise<
  { ok: true; data: CatalogStatusResponse } | { ok: false; error: string }
> {
  const res = await adminApiFetch('/api/v1/sync/status')
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` }
  }
  const data = await parseJSON<CatalogStatusResponse>(res)
  return { ok: true, data }
}
export const VULNERABILITY_REPORT_FILTER_KEYS = [
  'scanner_name',
  'catalog_source',
  'group_key',
  'group_id',
  'vulnerability_id',
  'cve',
  'cwe',
  'bdu_id',
  'severity',
  'run_channel',
  'asset_path',
  'version',
  'run_at_from',
  'run_at_to',
] as const

export type VulnerabilityReportFilters = Partial<
  Record<(typeof VULNERABILITY_REPORT_FILTER_KEYS)[number], string>
>

export async function fetchVulnerabilityReport(
  limit = 300,
  consoleProductId?: number | null,
  filters?: VulnerabilityReportFilters,
): Promise<{ ok: true; data: VulnerabilityReportRow[] } | { ok: false; error: string }> {
  const qp = new URLSearchParams({ limit: String(limit) })
  if (consoleProductId != null && Number.isFinite(consoleProductId) && consoleProductId > 0) {
    qp.set('console_product_id', String(consoleProductId))
  }
  if (filters) {
    for (const k of VULNERABILITY_REPORT_FILTER_KEYS) {
      const v = filters[k]?.trim()
      if (v) qp.set(k, v)
    }
  }
  const res = await apiFetch(`/api/v1/report/vulnerabilities?${qp.toString()}`)
  if (!res.ok) {
    const err = await parseJSON<{ error?: string }>(res).catch(() => ({}) as { error?: string })
    return { ok: false, error: err.error ?? `HTTP ${res.status}` }
  }
  const data = await parseJSON<VulnerabilityReportRow[]>(res)
  return { ok: true, data }
}

export type HealthStatus = 'ok' | 'fail' | 'pending'

export async function probeHealth(path: string): Promise<HealthStatus> {
  try {
    const res = await fetch(path, { method: 'GET' })
    if (!res.ok) return 'fail'
    const j = (await parseJSON<{ status?: string }>(res).catch(() => ({}))) as { status?: string }
    if (j.status === 'ok') return 'ok'
    return 'ok'
  } catch {
    return 'fail'
  }
}

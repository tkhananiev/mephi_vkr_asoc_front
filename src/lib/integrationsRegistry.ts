
import type { IntegrationCatalogApiItem, IntegrationsListResponse } from '../api/types'

export type IntegrationKind = 'SAST' | 'SCA' | 'DAST' | 'MAST' | 'Image Scan'
export type IntegrationInputKind =
  | 'filesystem'
  | 'lockfile'
  | 'http'
  | 'oci_image'
  | 'http_target'
  | 'manifest_only'
export type IntegrationRequiredContext = 'scm' | 'base_url'
export function inputKindLabel(kind: IntegrationInputKind | undefined): string {
  switch (kind) {
    case 'filesystem':
      return 'файловая система'
    case 'lockfile':
      return 'манифест / lockfile'
    case 'http':
    case 'http_target':
      return 'HTTP-цель'
    case 'oci_image':
      return 'OCI-образ'
    case 'manifest_only':
      return 'только манифест'
    default:
      return '—'
  }
}
export function requiredContextLabel(ctx: IntegrationRequiredContext): string {
  switch (ctx) {
    case 'scm':
      return 'SCM (URL репозитория)'
    case 'base_url':
      return 'базовый URL приложения'
    default:
      return ctx
  }
}
export type IntegrationRuntime =
  | { phase: 'ready'; launchAppPath?: string; apiScanPath?: string }
  | { phase: 'planned'; note?: string }

export type IntegrationCatalogEntry = {
id: string
  kind: IntegrationKind
  title: string
  summary: string
scannerName?: string
  inputKind?: IntegrationInputKind
  requiredContext?: IntegrationRequiredContext[]
  capabilities?: string[]
enabled?: boolean
  runtime: IntegrationRuntime
}

function isIntegrationKind(k: string): k is IntegrationKind {
  return k === 'SAST' || k === 'SCA' || k === 'DAST' || k === 'MAST' || k === 'Image Scan'
}

function isInputKind(k: string): k is IntegrationInputKind {
  return (
    k === 'filesystem' ||
    k === 'lockfile' ||
    k === 'http' ||
    k === 'oci_image' ||
    k === 'http_target' ||
    k === 'manifest_only'
  )
}

function isRequiredContext(k: string): k is IntegrationRequiredContext {
  return k === 'scm' || k === 'base_url'
}

function mapApiItem(row: IntegrationCatalogApiItem): IntegrationCatalogEntry | null {
  if (!isIntegrationKind(row.kind)) return null

  const base: Omit<IntegrationCatalogEntry, 'runtime'> = {
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    enabled: row.enabled,
    scannerName: row.scanner_name,
    capabilities: row.capabilities,
  }
  if (row.input_kind && isInputKind(row.input_kind)) {
    base.inputKind = row.input_kind
  }
  if (row.required_context?.length) {
    base.requiredContext = row.required_context.filter(isRequiredContext)
  }

  if (row.phase === 'planned') {
    return { ...base, runtime: { phase: 'planned', note: row.note } }
  }
  const trimmedConsole = (row.console_path ?? '').trim()
  const hasInvoke = (row.scanner_invoke_url ?? '').trim() !== ''
  const inferredPath =
    !trimmedConsole && hasInvoke ? `/app/scan/${encodeURIComponent(row.id)}` : undefined
  return {
    ...base,
    runtime: {
      phase: 'ready',
      launchAppPath: trimmedConsole || inferredPath || undefined,
      apiScanPath: row.api_scan_path || undefined,
    },
  }
}
export function integrationsFromApiResponse(resp: IntegrationsListResponse): IntegrationCatalogEntry[] {
  return resp.integrations.map(mapApiItem).filter((x): x is IntegrationCatalogEntry => x !== null)
}
export function compareRunnableScanOrder(a: IntegrationCatalogEntry, b: IntegrationCatalogEntry): number {
  const pri = (id: string) =>
    id === 'semgrep' ? 0 : id === 'gitleaks' ? 1 : id === 'trivy-sca' ? 2 : id === 'zap-dast' ? 3 : 4
  const d = pri(a.id) - pri(b.id)
  if (d !== 0) return d
  return a.title.localeCompare(b.title, 'ru')
}
export function listRunnableIntegrationScans(entries: IntegrationCatalogEntry[]): IntegrationCatalogEntry[] {
  const out = entries.filter((e) => {
    if (e.runtime.phase !== 'ready') return false
    if (e.enabled === false) return false
    return !!(e.runtime.launchAppPath ?? '').trim()
  })
  out.sort(compareRunnableScanOrder)
  return out
}

export function lookupIntegration(
  fetched: IntegrationCatalogEntry[] | null | undefined,
  id: string,
): IntegrationCatalogEntry | undefined {
  const tid = id.trim()
  const fromFetched = fetched?.find((x) => x.id === tid)
  if (fromFetched) return fromFetched
  return INTEGRATIONS_CATALOG.find((x) => x.id === tid)
}

export const INTEGRATIONS_CATALOG: IntegrationCatalogEntry[] = [
  {
    id: 'semgrep',
    kind: 'SAST',
    title: 'Semgrep',
    summary: 'Статический анализ исходного кода (SAST) по правилам Semgrep.',
    requiredContext: ['scm'],
    scannerName: 'semgrep',
    inputKind: 'filesystem',
    capabilities: ['sast', 'filesystem_target'],
    enabled: true,
    runtime: { phase: 'ready', launchAppPath: '/app/scan/semgrep', apiScanPath: '/api/v1/scans' },
  },
  {
    id: 'gitleaks',
    kind: 'SAST',
    title: 'Gitleaks',
    summary: 'Поиск секретов и чувствительной информации в исходном коде.',
    scannerName: 'gitleaks',
    inputKind: 'filesystem',
    capabilities: ['secrets', 'filesystem_target'],
    enabled: true,
    runtime: { phase: 'ready', launchAppPath: '/app/scan/gitleaks', apiScanPath: '/api/v1/scans/gitleaks' },
  },
  {
    id: 'trivy-sca',
    kind: 'SCA',
    title: 'Trivy (SCA)',
    summary: 'Анализ зависимостей и уязвимостей в lockfile и файловой системе репозитория.',
    scannerName: 'trivy-sca',
    inputKind: 'lockfile',
    requiredContext: ['scm'],
    capabilities: ['sca', 'lockfile_target', 'filesystem_target'],
    enabled: true,
    runtime: { phase: 'ready', launchAppPath: '/app/scan/trivy-sca', apiScanPath: '/api/v1/scans/sca' },
  },
  {
    id: 'zap-dast',
    kind: 'DAST',
    title: 'ZAP (DAST)',
    summary: 'Динамический анализ HTTP-цели через OWASP ZAP baseline (нормализованные находки для processing).',
    scannerName: 'zap-dast',
    inputKind: 'http_target',
    requiredContext: ['base_url'],
    capabilities: ['dast', 'http_target'],
    enabled: true,
    runtime: { phase: 'ready', launchAppPath: '/app/scan/zap-dast', apiScanPath: '/api/v1/scans/dast' },
  },
]

export function getIntegrationById(id: string): IntegrationCatalogEntry | undefined {
  return INTEGRATIONS_CATALOG.find((x) => x.id === id)
}

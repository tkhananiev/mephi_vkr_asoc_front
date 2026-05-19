/** Каталог сканеров для GUI (из ответа бэкенда; при недоступности — `INTEGRATIONS_CATALOG`). */

import type { IntegrationCatalogApiItem, IntegrationsListResponse } from '../api/types'

export type IntegrationKind = 'SAST' | 'SCA' | 'DAST' | 'MAST' | 'Image Scan'

/** Вход сканера с точки зрения оркестрации (без секретов). */
export type IntegrationInputKind = 'filesystem' | 'lockfile' | 'http'

/** Подключение с точки зрения консоли. */
export type IntegrationRuntime =
  | { phase: 'ready'; launchAppPath?: string; apiScanPath?: string }
  | { phase: 'planned'; note?: string }

export type IntegrationCatalogEntry = {
  /** Стабильный ключ для кода и API: semgrep | trivy-sca | zap-dast … */
  id: string
  kind: IntegrationKind
  title: string
  summary: string
  /** Имя для processing / тела скана (`scanner_name`). */
  scannerName?: string
  inputKind?: IntegrationInputKind
  capabilities?: string[]
  /** С сервера: политика/тенант выключили инструмент. */
  enabled?: boolean
  runtime: IntegrationRuntime
}

function isIntegrationKind(k: string): k is IntegrationKind {
  return k === 'SAST' || k === 'SCA' || k === 'DAST' || k === 'MAST' || k === 'Image Scan'
}

function isInputKind(k: string): k is IntegrationInputKind {
  return k === 'filesystem' || k === 'lockfile' || k === 'http'
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

/** Преобразует ответ API в записи таблицы «Инструменты». */
export function integrationsFromApiResponse(resp: IntegrationsListResponse): IntegrationCatalogEntry[] {
  return resp.integrations.map(mapApiItem).filter((x): x is IntegrationCatalogEntry => x !== null)
}

/** Приоритет кнопок скана на карточках продуктов (остальные — по названию). */
export function compareRunnableScanOrder(a: IntegrationCatalogEntry, b: IntegrationCatalogEntry): number {
  const pri = (id: string) => (id === 'semgrep' ? 0 : id === 'gitleaks' ? 1 : 2)
  const d = pri(a.id) - pri(b.id)
  if (d !== 0) return d
  return a.title.localeCompare(b.title, 'ru')
}

/** Инструменты, для которых в GUI есть ссылка «Открыть скан» (`launchAppPath`). */
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
    summary: '',
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
]

export function getIntegrationById(id: string): IntegrationCatalogEntry | undefined {
  return INTEGRATIONS_CATALOG.find((x) => x.id === id)
}

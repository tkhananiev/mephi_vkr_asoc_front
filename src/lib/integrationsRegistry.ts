/**
 * Каталог сканеров для GUI.
 *
 * Источник правды: `GET /api/v1/integrations` (если недоступен — массив `INTEGRATIONS_CATALOG` ниже).
 * В fallback только то, что реально есть у платформы; «заготовки под SCA/DAST» не показываем.
 */

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
  return {
    ...base,
    runtime: {
      phase: 'ready',
      launchAppPath: row.console_path || undefined,
      apiScanPath: row.api_scan_path || undefined,
    },
  }
}

/** Преобразует ответ API в записи таблицы «Инструменты». */
export function integrationsFromApiResponse(resp: IntegrationsListResponse): IntegrationCatalogEntry[] {
  return resp.integrations.map(mapApiItem).filter((x): x is IntegrationCatalogEntry => x !== null)
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
    runtime: { phase: 'ready', launchAppPath: '/app/scan/gitleaks', apiScanPath: '/api/v1/scans' },
  },
]

export function getIntegrationById(id: string): IntegrationCatalogEntry | undefined {
  return INTEGRATIONS_CATALOG.find((x) => x.id === id)
}

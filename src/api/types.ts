/** Элемент каталога интеграций в ответе бэкенда (поля совпадают с JSON как у сервера). */
export interface IntegrationCatalogApiItem {
  id: string
  kind: string
  title: string
  summary: string
  phase: 'ready' | 'planned'
  enabled: boolean
  input_kind: string
  required_context?: string[]
  scanner_name?: string
  api_scan_path?: string
  console_path?: string
  capabilities?: string[]
  note?: string
  /** Сводка сети или устаревшее поле; при сохранении может вычисляться из hostname/IP/порта. */
  network_host?: string
  /** Сетевое имя хоста (справочно). */
  network_hostname?: string
  /** IP-адрес хоста (справочно). */
  network_ip?: string
  /** Порт сервиса (справочно). */
  network_port?: string
  /** Полный URL при вызове внешнего или встроенного раннер-сканера. */
  scanner_invoke_url?: string
  /** Шаблон shell для generic-scan-runner: плейсхолдеры {target_path}, {git_repository_url}, … */
  runner_command?: string
  /** Подсказка админу: CLI, поля POST и т.д. */
  invoke_hint?: string
  /** Шаблон или пример JSON-тела POST для вызова сервиса. */
  invoke_payload_template?: string
}

export interface IntegrationsListResponse {
  integrations: IntegrationCatalogApiItem[]
}

export interface AdminIntegrationCatalogEntryDTO {
  source: 'builtin' | 'additional'
  integration: IntegrationCatalogApiItem
}

export interface ScanRequestBody {
  scanner_name?: string
  target_path?: string
  target_url?: string
  git_repository_url?: string
  git_repository_ref?: string
  semgrep_config?: string
  /** Привязка прогона к выбранному продукту в консоли. */
  console_product_id?: number
}

/** Тело запроса на запуск сканирования (`scanner_id` — какой исполнитель; остальное как у семgrep-сценария). */
export type UnifiedScanRequestBody = ScanRequestBody & {
  scanner_id: string
  options?: Record<string, unknown>
}

export interface ProcessingSummary {
  run_id: number
  findings_received: number
  findings_processed: number
  vulnerabilities_created: number
  groups_updated: number
}

export interface GroupRow {
  id: number
  group_key: string
  grouping_rule: string
  severity_max: string
  assets_count: number
  status: string
}

export interface TicketRow {
  group_id: number
  jira_issue_key: string
  jira_issue_url: string
  sync_status: string
  idempotency_key: string
}

export interface PassportResponse {
  scanner_name: string
  scan_target: string
  findings: unknown[]
  processing: ProcessingSummary
  groups: GroupRow[]
  tickets: TicketRow[]
}

export interface SyncRunRow {
  id: number
  source_code: string
  status: string
  items_discovered?: number
  items_processed?: number
  items_inserted?: number
  items_updated?: number
  started_at?: string
  finished_at?: string
  error_message?: string
}

export interface CatalogStatusResponse {
  record_counts: Record<string, number>
  running_syncs: SyncRunRow[]
  last_completed_at: Record<string, string>
  nvd_cursor_present: boolean
  nvd_full_sync_completed: boolean
  sync_in_progress: boolean
}

/** Строка отчёта: одна уязвимость; в UI группируется по group_id */
export interface VulnerabilityReportRow {
  group_id: number
  group_key: string
  vulnerability_id: number
  cve: string
  bdu_id: string
  scanner_name: string
  asset_path: string
  version: string
  severity: string
  run_at?: string
  catalog_source?: string
  /** Канал прогона: консоль или CI (см. processing_runs.channel). */
  run_channel?: 'manual' | 'ci'
}

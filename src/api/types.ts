
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
network_host?: string
network_hostname?: string
network_ip?: string
network_port?: string
scanner_invoke_url?: string
runner_command?: string
invoke_hint?: string
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
console_product_id?: number
}
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
run_channel?: 'manual' | 'ci'
}

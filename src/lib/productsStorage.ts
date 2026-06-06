
import { apiFetch } from '../api/client'
import { TOKEN_KEY } from '../auth/token'

export const DEFAULT_SEMGREP_MOUNT_PATH = '/app/demo/scan-targets/WebGoat/'

export type StoredProduct = {
  id: number
  name: string
  description: string
  repositoryUrl: string
  repositoryRef: string
  repositoryBranchRefs: string[]
  repositorySubdirectory: string
  scanTargetPath: string
  createdAt: string
}

const ACTIVE_KEY = 'asoc_console_active_product_v1'

type ApiProductRow = {
  id: number
  name: string
  description: string
  repository_url: string
  repository_ref: string
  repository_branch_refs?: string[]
  repository_subdirectory: string
  scan_target_path: string
  created_at: string
}

let cache: StoredProduct[] | null = null
let inflight: Promise<StoredProduct[]> | null = null

function normalizeBranchList(ref: string, fromApi?: string[]): string[] {
  const raw = Array.isArray(fromApi) ? fromApi : []
  const seen = new Set<string>()
  const out: string[] = []
  for (const b of raw) {
    const t = (b ?? '').trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  if (out.length > 0) return out
  const one = ref.trim()
  return [one.length > 0 ? one : 'main']
}

function mapRow(r: ApiProductRow): StoredProduct {
  let scanTargetPath = (r.scan_target_path ?? '').trim()
  if (!scanTargetPath) scanTargetPath = DEFAULT_SEMGREP_MOUNT_PATH
  if (!scanTargetPath.endsWith('/')) scanTargetPath += '/'

  let ref = (r.repository_ref ?? '').trim()
  if (!ref) ref = 'main'
  const branchRefs = normalizeBranchList(ref, r.repository_branch_refs)

  return {
    id: r.id,
    name: r.name ?? '',
    description: r.description ?? '',
    repositoryUrl: r.repository_url ?? '',
    repositoryRef: branchRefs[0] ?? ref,
    repositoryBranchRefs: branchRefs,
    repositorySubdirectory: (r.repository_subdirectory ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''),
    scanTargetPath,
    createdAt: r.created_at ?? new Date(0).toISOString(),
  }
}

async function readErrorHint(res: Response): Promise<string | undefined> {
  try {
    const j = (await res.json()) as { error?: string }
    return j.error
  } catch {
    return undefined
  }
}
export function invalidateProductsCache(): void {
  cache = null
  inflight = null
}

async function loadFromServer(): Promise<StoredProduct[]> {
  const res = await apiFetch('/api/v1/console/products')
  if (!res.ok) {
    const hint = await readErrorHint(res)
    throw new Error(hint ?? `Не удалось загрузить продукты (HTTP ${res.status})`)
  }
  const rows = (await res.json()) as ApiProductRow[]
  if (!Array.isArray(rows)) {
    throw new Error('Некорректный ответ сервера')
  }
  return rows.map(mapRow)
}

function normalizeActiveAfterLoad(): void {
  const id = getActiveProductId()
  if (!id || !cache) return
  const n = Number(id)
  if (!Number.isFinite(n) || !cache.some((p) => p.id === n)) {
    localStorage.removeItem(ACTIVE_KEY)
  }
}
export async function ensureProductsLoaded(): Promise<StoredProduct[]> {
  if (typeof window === 'undefined') return []
  if (!localStorage.getItem(TOKEN_KEY)) {
    cache = []
    return []
  }
  if (cache) return cache
  if (inflight) return inflight
  inflight = loadFromServer()
    .then((rows) => {
      cache = rows
      normalizeActiveAfterLoad()
      return cache
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export async function listProducts(): Promise<StoredProduct[]> {
  const rows = await ensureProductsLoaded()
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export function dedupeBranches(branches: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const b of branches) {
    const t = b.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out.length > 0 ? out : ['main']
}

export async function createProduct(
  name: string,
  description: string,
  repositoryUrl: string,
  repositoryRef: string,
  repositorySubdirectory: string,
  scanTargetPath: string = DEFAULT_SEMGREP_MOUNT_PATH,
  repositoryBranchRefs?: string[],
): Promise<StoredProduct> {
  const pathRaw = scanTargetPath.trim() || DEFAULT_SEMGREP_MOUNT_PATH
  const sub = repositorySubdirectory.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const branches =
    repositoryBranchRefs && repositoryBranchRefs.length > 0
      ? dedupeBranches(repositoryBranchRefs)
      : dedupeBranches([repositoryRef.trim() || 'main'])
  const ref = branches[0] ?? 'main'

  const res = await apiFetch('/api/v1/console/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      repository_url: repositoryUrl.trim(),
      repository_ref: ref,
      repository_branch_refs: branches,
      repository_subdirectory: sub,
      scan_target_path: pathRaw.endsWith('/') ? pathRaw : `${pathRaw}/`,
    }),
  })

  if (!res.ok) {
    const hint = await readErrorHint(res)
    throw new Error(hint ?? `Не удалось создать продукт (HTTP ${res.status})`)
  }

  const row = (await res.json()) as ApiProductRow
  const p = mapRow(row)
  cache = cache ? [p, ...cache] : [p]
  setActiveProductId(String(p.id))
  return p
}

export async function updateProduct(
  id: number,
  name: string,
  description: string,
  repositoryUrl: string,
  repositoryRef: string,
  repositorySubdirectory: string,
  scanTargetPath: string = DEFAULT_SEMGREP_MOUNT_PATH,
  repositoryBranchRefs?: string[],
): Promise<StoredProduct> {
  const pathRaw = scanTargetPath.trim() || DEFAULT_SEMGREP_MOUNT_PATH
  const sub = repositorySubdirectory.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const branches =
    repositoryBranchRefs && repositoryBranchRefs.length > 0
      ? dedupeBranches(repositoryBranchRefs)
      : dedupeBranches([repositoryRef.trim() || 'main'])
  const ref = branches[0] ?? 'main'

  const res = await apiFetch(`/api/v1/console/products/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      repository_url: repositoryUrl.trim(),
      repository_ref: ref,
      repository_branch_refs: branches,
      repository_subdirectory: sub,
      scan_target_path: pathRaw.endsWith('/') ? pathRaw : `${pathRaw}/`,
    }),
  })

  if (!res.ok) {
    const hint = await readErrorHint(res)
    throw new Error(hint ?? `Не удалось обновить продукт (HTTP ${res.status})`)
  }

  const row = (await res.json()) as ApiProductRow
  const p = mapRow(row)
  cache = cache ? cache.map((x) => (x.id === p.id ? p : x)) : [p]
  return p
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await apiFetch(`/api/v1/console/products/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 204) {
    const hint = await readErrorHint(res)
    throw new Error(hint ?? `Не удалось удалить продукт (HTTP ${res.status})`)
  }
  cache = cache ? cache.filter((x) => x.id !== id) : null
  const aid = getActiveProductId()
  if (aid === String(id)) {
    localStorage.removeItem(ACTIVE_KEY)
  }
}

export function getActiveProductId(): string | null {
  try {
    const s = localStorage.getItem(ACTIVE_KEY)?.trim()
    if (!s) return null
    return s
  } catch {
    return null
  }
}

export function setActiveProductId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function getActiveProduct(): StoredProduct | null {
  const id = getActiveProductId()
  if (!id || !cache) return null
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  return cache.find((p) => p.id === n) ?? null
}

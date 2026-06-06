import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { fetchCatalogStatus, runScanForApiPath } from '../api/client'
import type { CatalogStatusResponse, PassportResponse, ScanRequestBody } from '../api/types'
import { useIntegrationsCatalog } from '../context/IntegrationsCatalogContext'
import { DEFAULT_SEMGREP_MOUNT_PATH, ensureProductsLoaded, getActiveProduct, listProducts, type StoredProduct } from '../lib/productsStorage'
import { PageFrame } from '../layout/PageFrame'
import { lookupIntegration, type IntegrationCatalogEntry } from '../lib/integrationsRegistry'

function formatRu(ts: string): string {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium' })
}

function CatalogStatusBanner({
  statusErr,
  status,
  scanRequiresActiveProduct,
}: {
  statusErr: string | null
  status: CatalogStatusResponse | undefined
  scanRequiresActiveProduct?: boolean
}) {
  if (statusErr) {
    return (
      <div className="msg-banner" style={{ borderColor: 'rgba(180, 60, 60, 0.45)' }}>
        <strong>Каталог NVD / БДУ:</strong> не удалось получить статус ({statusErr}). Запуск скана возможен, актуальность
        каталога неизвестна.
      </div>
    )
  }
  if (!status) {
    return (
      <div className="msg-banner" style={{ borderColor: 'rgba(0, 91, 171, 0.25)' }}>
        Проверяем каталог NVD / БДУ…
      </div>
    )
  }

  const nvd = status.record_counts.nvd ?? 0
  const bdu = status.record_counts.bdu_fstec ?? 0
  const total = nvd + bdu
  const warnEmpty = total === 0

  let border = 'rgba(0, 91, 171, 0.25)'
  if (warnEmpty) border = 'rgba(180, 120, 0, 0.45)'

  const lastNvd = status.last_completed_at?.nvd
  const lastBdu = status.last_completed_at?.bdu_fstec

  const partsJsx: ReactNode[] = [
    scanRequiresActiveProduct ? (
      <span key="a">
        Укажите продукт в адресной строке (ссылка с карточки) или откройте список в{' '}
        <Link to="/app/products">«Продуктах»</Link> и запуск оттуда.
      </span>
    ) : (
      <span key="a">Продукты заданы; каталог нужен для корреляции с NVD / БДУ.</span>
    ),
    <span key="b">
      <strong>NVD</strong> — {nvd} запис., <strong>БДУ ФСТЭК</strong> — {bdu} запис.
    </span>,
  ]
  if (lastNvd) partsJsx.push(<span key="ln">Последний успешный синк NVD: {formatRu(lastNvd)}.</span>)
  if (lastBdu) partsJsx.push(<span key="lb">Последний успешный синк БДУ: {formatRu(lastBdu)}.</span>)
  if (status.nvd_cursor_present && !status.nvd_full_sync_completed) {
    partsJsx.push(
      <span key="incr">NVD: инкрементальные окна активны (полный прогон ещё не отмечен как завершённый).</span>,
    )
  }

  if (warnEmpty) {
    partsJsx.push(
      <span key="emp">
        Каталог пуст — сопоставление находок с NVD/БДУ не сработает. Нужна загрузка справочников на стороне платформы
        администратором.
      </span>,
    )
  }

  return (
    <div className="msg-banner" style={{ borderColor: border }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Каталог NVD / БДУ</div>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {partsJsx.map((node, idx) => (
          <li key={idx} style={{ marginBottom: 4 }}>
            {node}
          </li>
        ))}
      </ul>
    </div>
  )
}

const defaultSemgrepCfg = 'p/java'

export type ScanRunProps = {
  scannerId: string
}

function eyebrowForScanPage(scannerId: string, entry: IntegrationCatalogEntry | undefined): string {
  if (scannerId === 'gitleaks') return 'Secrets'
  if (scannerId === 'semgrep') return 'SAST'
  switch (entry?.kind) {
    case 'SCA':
      return 'SCA'
    case 'DAST':
      return 'DAST'
    case 'MAST':
      return 'MAST'
    case 'Image Scan':
      return 'Образ'
    default:
      return 'Сканирование'
  }
}

function parseProductIdsFromSearch(search: string): number[] {
  const sp = new URLSearchParams(search)
  const single = sp.get('product')
  if (single != null && single.trim() !== '') {
    const n = Number(single.trim())
    return Number.isFinite(n) && n > 0 ? [Math.trunc(n)] : []
  }
  const csv = sp.get('products')
  if (!csv?.trim()) return []
  const out: number[] = []
  for (const part of csv.split(',')) {
    const n = Number(part.trim())
    if (Number.isFinite(n) && n > 0) out.push(Math.trunc(n))
  }
  return [...new Set(out)]
}

function branchOptionsForProduct(p: StoredProduct): string[] {
  if (!(p.repositoryUrl ?? '').trim()) return []
  const refs = (
    p.repositoryBranchRefs?.length ? p.repositoryBranchRefs : [(p.repositoryRef || 'main').trim() || 'main']
  ).filter((x) => (x ?? '').trim())
  return refs.length > 0 ? refs : ['main']
}

function describeProductLine(p: StoredProduct): ReactNode {
  const scm = (p.repositoryUrl ?? '').trim()
  if (!scm) {
    return (
      <>
        <strong>{p.name}</strong>
        {' — '}
        <span className="mono">{p.scanTargetPath}</span> (встроенный каталог без SCM)
      </>
    )
  }
  return (
    <>
      <strong>{p.name}</strong>
      {' — '}
      <span className="mono" style={{ wordBreak: 'break-all' }}>
        {scm}
      </span>
    </>
  )
}

export function ScanRun({ scannerId }: ScanRunProps) {
  const location = useLocation()
  const { entries: integrationRowsArr } = useIntegrationsCatalog()
  const idsFromUrl = useMemo(() => parseProductIdsFromSearch(location.search), [location.search])

  const scanTool = useMemo(
    () => lookupIntegration(integrationRowsArr, scannerId),
    [integrationRowsArr, scannerId],
  )

  const [lineup, setLineup] = useState<StoredProduct[]>([])
  const [missingMsg, setMissingMsg] = useState<string | null>(null)

  const [targetPath, setTargetPath] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [semgrepConfig, setSemgrepConfig] = useState(defaultSemgrepCfg)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PassportResponse | null>(null)
  const [queueDump, setQueueDump] = useState<string>('')

  const [cat, setCat] = useState<CatalogStatusResponse | undefined>(undefined)
  const [catErr, setCatErr] = useState<string | null>(null)

  const [branchPick, setBranchPick] = useState<Record<number, string>>({})

  const isMulti = lineup.length > 1
  const scmModeSingle = lineup.length === 1 && !!(lineup[0]?.repositoryUrl ?? '').trim()
  const inputKind = scanTool?.inputKind
  const httpTargetMode = inputKind === 'http' || inputKind === 'http_target' || scannerId === 'zap-dast'

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await ensureProductsLoaded()
      if (cancelled) return
      try {
        const rows = await listProducts()
        if (cancelled) return

        const idList = parseProductIdsFromSearch(location.search)
        if (idList.length === 0) {
          const ap = getActiveProduct()
          setLineup(ap ? [ap] : [])
          setMissingMsg(null)
          return
        }
        const resolved = idList
          .map((id) => rows.find((r) => r.id === id))
          .filter((x): x is StoredProduct => Boolean(x))

        const lost = idList.filter((id) => !resolved.some((r) => r.id === id))
        if (lost.length > 0) {
          setMissingMsg(`Не найдены продукты с id: ${lost.join(', ')}. Обновите список или проверьте ссылку.`)
        } else {
          setMissingMsg(null)
        }

        const ordered = idList.map((id) => resolved.find((r) => r.id === id)).filter((x): x is StoredProduct => Boolean(x))

        setLineup(ordered)
      } catch (e) {
        if (!cancelled) setMissingMsg(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [location.search])

  useEffect(() => {
    setBranchPick((prev) => {
      const next: Record<number, string> = { ...prev }
      for (const p of lineup) {
        const opts = branchOptionsForProduct(p)
        const first = opts[0] ?? 'main'
        if (!next[p.id] || (!!(p.repositoryUrl ?? '').trim() && !opts.includes(next[p.id]))) {
          next[p.id] = first
        }
      }
      for (const k of Object.keys(next)) {
        const id = Number(k)
        if (!lineup.some((l) => l.id === id)) delete next[id]
      }
      return next
    })
  }, [lineup])

  useEffect(() => {
    const seed = lineup.length === 1 ? lineup[0] : undefined
    if (!seed) {
      setTargetPath('')
      setTargetUrl('')
      return
    }
    if (httpTargetMode) {
      const guess = (seed.scanTargetPath ?? '').trim()
      setTargetUrl(guess.startsWith('http://') || guess.startsWith('https://') ? guess : '')
      setTargetPath('')
      return
    }
    if ((seed.repositoryUrl ?? '').trim()) {
      setTargetPath(seed.repositorySubdirectory ?? '')
    } else {
      setTargetPath(seed.scanTargetPath ?? DEFAULT_SEMGREP_MOUNT_PATH)
    }
    setTargetUrl('')
  }, [lineup, httpTargetMode])

  const refreshCatalog = useCallback(async () => {
    const r = await fetchCatalogStatus()
    if (!r.ok) {
      setCat(undefined)
      setCatErr(r.error)
      return
    }
    setCatErr(null)
    setCat(r.data)
  }, [])

  useEffect(() => {
    void refreshCatalog()
    const t = setInterval(() => void refreshCatalog(), 12_000)
    return () => clearInterval(t)
  }, [refreshCatalog])



  function bodyForProduct(p: StoredProduct): ScanRequestBody {
    const useGit = !!(p.repositoryUrl ?? '').trim()
    const pickBranch = branchPick[p.id]?.trim() || branchOptionsForProduct(p)[0] || 'main'
    const subOrPath = targetPath.trim()
    const scannerNameForBody = scanTool?.scannerName?.trim() || scannerId

    const body: ScanRequestBody = {
      scanner_name: scannerNameForBody,
      console_product_id: p.id,
      ...(scannerId === 'semgrep' ? { semgrep_config: semgrepConfig.trim() || undefined } : {}),
    }
    if (httpTargetMode) {
      body.target_url = targetUrl.trim() || undefined
      return body
    }
    if (useGit) {
      body.git_repository_url = (p.repositoryUrl ?? '').trim()
      body.git_repository_ref = pickBranch || 'main'
      body.target_path = subOrPath || undefined
    } else {
      body.target_path = subOrPath || undefined
    }
    return body
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (lineup.length === 0) {
      setError('Нет ни одного продукта для сканирования.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setQueueDump('')

    const apiScanPath =
      scanTool?.runtime.phase === 'ready' ? scanTool.runtime.apiScanPath : undefined

    if (lineup.length === 1) {
      const out = await runScanForApiPath(apiScanPath, scannerId, bodyForProduct(lineup[0]))
      setLoading(false)
      if (!out.ok) {
        setError(out.error)
        return
      }
      setResult(out.data)
      return
    }

    const chunks: string[] = []
    for (let i = 0; i < lineup.length; i++) {
      const p = lineup[i]
      chunks.push(`— продукт «${p.name}» (${p.id}) —`)
      const out = await runScanForApiPath(apiScanPath, scannerId, bodyForProduct(p))
      if (!out.ok) {
        chunks.push(`ОШИБКА: ${out.error}`)
      } else {
        chunks.push(JSON.stringify(out.data, null, 2))
      }
    }
    setLoading(false)
    setQueueDump(chunks.join('\n\n'))
  }

  const pageEyebrow = eyebrowForScanPage(scannerId, scanTool)
  const pageTitle =
    scannerId === 'gitleaks'
      ? 'Поиск секретов в коде и истории Git (Gitleaks)'
      : scannerId === 'semgrep'
        ? 'Статический анализ (SAST)'
        : scannerId === 'trivy-sca'
          ? 'Анализ зависимостей (SCA, Trivy)'
          : scannerId === 'zap-dast'
            ? 'Динамический анализ (DAST)'
            : scanTool?.title?.trim() || scannerId
  const pageLead =
    idsFromUrl.length > 1
      ? `Очередь из ${idsFromUrl.length} продуктов: пайплайн выполняется для каждого по порядку; результаты пишутся в одно окно ниже.`
      : idsFromUrl.length === 1
        ? `Запуск привязан к выбранному продукту; результаты попадут в отчёт и группы именно этого продукта.`
        : 'Если без параметров в адресе, используется ранее выбранный «активный» продукт из браузера; надежнее открыть запуск из карточки в «Продуктах».'

  const textareaValue = queueDump || (result ? JSON.stringify(result, null, 2) : '')

  const scanRequiresBanner = lineup.length === 0

  return (
    <PageFrame eyebrow={pageEyebrow} title={pageTitle} lead={pageLead}>
      <CatalogStatusBanner statusErr={catErr} status={cat} scanRequiresActiveProduct={scanRequiresBanner} />
      {missingMsg ? (
        <p className="err" style={{ marginTop: '0.75rem' }}>
          {missingMsg}
        </p>
      ) : null}

      {lineup.length === 0 ? (
        <div className="panel-elevated" style={{ width: '100%', maxWidth: 920, padding: '1.25rem 1.35rem', marginTop: '0.85rem' }}>
          <h2 className="card-title" style={{ marginTop: 0 }}>
            <span className="card-title-dot" aria-hidden />
            Нужен продукт
          </h2>
          <p style={{ margin: '0 0 1rem', lineHeight: 1.55 }}>
            Откройте продукт в <Link to="/app/products">разделе «Продукты»</Link> и запустите нужный инструмент с карточки
            продукта, либо выберите активный продукт там же и вернитесь без параметров в адресе.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            <Link to="/app/products/new" className="btn btn-primary">
              Добавить продукт
            </Link>
            <Link to="/app/products" className="btn btn-ghost">
              К списку продуктов
            </Link>
          </div>
        </div>
      ) : (
        <div className="split" style={{ marginTop: '0.85rem' }}>
          <div className="panel-elevated">
            <h2 className="card-title" style={{ marginTop: 0 }}>
              <span className="card-title-dot" aria-hidden />
              {isMulti ? `Очередь (${lineup.length} шт.)` : 'Параметры'}
            </h2>
            <form className="form-grid" onSubmit={onSubmit}>
              <div className="field">
                <span>Продукт{isMulti ? 'ы' : ''}</span>
                {lineup.map((p) =>
                  branchOptionsForProduct(p).length > 1 ? (
                    <div key={p.id} style={{ marginBottom: '0.65rem' }}>
                      <p style={{ margin: '0 0 0.25rem', lineHeight: 1.45 }}>{describeProductLine(p)}</p>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Ветка для этого прогона:&nbsp;
                        <select
                          className="mono"
                          value={branchPick[p.id] ?? branchOptionsForProduct(p)[0]}
                          onChange={(ev) =>
                            setBranchPick((prev) => ({
                              ...prev,
                              [p.id]: ev.target.value,
                            }))
                          }
                        >
                          {branchOptionsForProduct(p).map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <p key={p.id} style={{ margin: '0 0 0.45rem', lineHeight: 1.45 }}>
                      {describeProductLine(p)}
                    </p>
                  ),
                )}
                <span className="hint" style={{ display: 'block', marginTop: 6 }}>
                  Выбор нескольких — в «Продуктах» отметьте галочками нужные карточки и откройте очередной запуск оттуда (или воспользуйтесь множественной ссылкой с той же страницы).
                </span>
              </div>

              {httpTargetMode ? (
                <label className="field">
                  <span>Базовый URL приложения</span>
                  <span className="hint">
                    Публичный HTTP(S) адрес стенда (не localhost). Секреты и постоянный URL продукта хранятся на сервере — в
                    следующих итерациях.
                  </span>
                  <input
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com/app"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              ) : (
                <details className="field" style={{ marginTop: '-0.25rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
                    {(isMulti ? 'Дополнительно: путь или подкаталог для всех прогонов' : scmModeSingle)
                      ? 'Дополнительно: переопределить подкаталог внутри клона только для этого запуска'
                      : 'Дополнительно: другой каталог кода только для этого запуска'}
                  </summary>
                  <label className="field" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                    <span className="hint">
                      {isMulti
                        ? scmModeSingle
                          ? 'Одинаковое относительное смещение от корня клона для всех SCM-продуктов в очереди; для продуктов без SCM используется тот же встроенный абсолютный путь в образе.'
                          : 'Подкаталог / путь в образе, одинаково для каждого прогона очереди.'
                        : scmModeSingle
                          ? 'относительный путь от корня репозитория после clone; пусто — корень клона'
                          : 'абсолютный путь внутри среды сканирования'}
                    </span>
                    <input value={targetPath} onChange={(e) => setTargetPath(e.target.value)} autoComplete="off" spellCheck={false} />
                  </label>
                </details>
              )}

              {scannerId === 'semgrep' ? (
                <label className="field">
                  <span>Профиль Semgrep</span>
                  <span className="hint">YAML или пресет правил Semgrep (например, готовые наборы вроде p/java).</span>
                  <input value={semgrepConfig} onChange={(e) => setSemgrepConfig(e.target.value)} autoComplete="off" spellCheck={false} />
                </label>
              ) : null}

              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Пайплайн выполняется…' : isMulti ? 'Запустить очередь' : 'Запустить сценарий'}
              </button>
              {error ? <p className="err">{error}</p> : null}
            </form>
          </div>
          <div>
            <div className="code-window">
              <div className="code-window-hd">
                <span className="code-window-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span>response.json</span>
              </div>
              <textarea
                className="code-preview"
                readOnly
                placeholder="// ответ API появится здесь"
                value={textareaValue}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  )
}

/** Маршрут `/app/scan/:scannerId` — id из каталога интеграций. */
export function ScanRunRoute() {
  const { scannerId } = useParams()
  const raw = scannerId ? decodeURIComponent(scannerId) : ''
  const id = raw.trim()
  if (!id) return <Navigate to="/app/scan/semgrep" replace />
  return <ScanRun scannerId={id} />
}

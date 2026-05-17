import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchCatalogStatus, runUnifiedScanScenario } from '../api/client'
import type { CatalogStatusResponse, PassportResponse, ScanRequestBody } from '../api/types'
import { DEFAULT_SEMGREP_MOUNT_PATH, ensureProductsLoaded, getActiveProduct } from '../lib/productsStorage'
import { PageFrame } from '../layout/PageFrame'

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
  /** Если true — в баннере не обещаем свободный запуск без продукта. */
  scanRequiresActiveProduct?: boolean
}) {
  if (statusErr) {
    return (
      <div className="msg-banner" style={{ borderColor: 'rgba(180, 60, 60, 0.45)' }}>
        <strong>Справочник:</strong> не удалось получить статус ({statusErr}). Запуск скана возможен,
        актуальность каталога неизвестна.
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
        Сканирование доступно только при <strong>выбранном активном продукте</strong> (
        <Link to="/app/products">Продукты</Link>
        ).
      </span>
    ) : (
      <span key="a">Запуск скана можно выполнять в любой момент.</span>
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
        Каталог пуст — сопоставление находок с NVD/БДУ не сработает. Выполните синк на странице «Справочник» или дождитесь
        миграций.
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

const defaultBody = {
  target_path: DEFAULT_SEMGREP_MOUNT_PATH,
  semgrep_config: 'p/java',
}

export type ScanRunnerId = 'semgrep' | 'gitleaks'

export type ScanRunProps = {
  scannerId: ScanRunnerId
}

export function ScanRun({ scannerId }: ScanRunProps) {
  const location = useLocation()
  const [activeProduct, setActiveProduct] = useState(() => getActiveProduct())
  const scmMode = !!(activeProduct?.repositoryUrl ?? '').trim()

  const [targetPath, setTargetPath] = useState(DEFAULT_SEMGREP_MOUNT_PATH)
  const [semgrepConfig, setSemgrepConfig] = useState(defaultBody.semgrep_config)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PassportResponse | null>(null)
  const [cat, setCat] = useState<CatalogStatusResponse | undefined>(undefined)
  const [catErr, setCatErr] = useState<string | null>(null)

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

  useEffect(() => {
    void ensureProductsLoaded().then(() => setActiveProduct(getActiveProduct()))
  }, [location.pathname, location.key])

  useEffect(() => {
    const cur = activeProduct
    if (cur && (cur.repositoryUrl ?? '').trim()) {
      setTargetPath(cur.repositorySubdirectory ?? '')
      return
    }
    setTargetPath(cur?.scanTargetPath ?? DEFAULT_SEMGREP_MOUNT_PATH)
  }, [activeProduct])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activeProduct) {
      setError('Сначала выберите или создайте продукт в разделе «Продукты».')
      return
    }
    setLoading(true)
    setError(null)
    const cur = activeProduct
    const useGit = !!(cur?.repositoryUrl ?? '').trim()

    const body: ScanRequestBody = {
      scanner_name: scannerId,
      ...(scannerId === 'semgrep' ? { semgrep_config: semgrepConfig.trim() || undefined } : {}),
    }
    const p = targetPath.trim()
    if (useGit && cur) {
      body.git_repository_url = cur.repositoryUrl.trim()
      const ref = (cur.repositoryRef ?? 'main').trim() || 'main'
      body.git_repository_ref = ref
      body.target_path = p || undefined
    } else {
      body.target_path = p || undefined
    }

    const out = await runUnifiedScanScenario(scannerId, body)
    setLoading(false)
    if (!out.ok) {
      setResult(null)
      setError(out.error)
      return
    }
    setResult(out.data)
  }

  const pageEyebrow = scannerId === 'gitleaks' ? 'Secrets' : 'SAST'
  const pageTitle =
    scannerId === 'gitleaks' ? 'Поиск секретов в коде и истории Git (Gitleaks)' : 'Статический анализ (SAST)'
  const pageLead =
    'Сканирование выполняется в контексте активного продукта (SCM или путь к коду). Без продукта запуск недоступен.'

  return (
    <PageFrame
      eyebrow={pageEyebrow}
      title={pageTitle}
      lead={pageLead}
      badge="api-service :8080"
    >
      <CatalogStatusBanner statusErr={catErr} status={cat} scanRequiresActiveProduct />

      {!activeProduct ? (
        <div className="panel-elevated" style={{ maxWidth: 640, padding: '1.25rem 1.35rem' }}>
          <h2 className="card-title" style={{ marginTop: 0 }}>
            <span className="card-title-dot" aria-hidden />
            Нужен продукт
          </h2>
          <p style={{ margin: '0 0 1rem', lineHeight: 1.55 }}>
            Чтобы запустить сканирование, добавьте продукт (приложение / сервис) и сделайте его <strong>активным</strong>{' '}
            в списке продуктов. Контейнер сканирования и при необходимости git clone настраиваются из карточки продукта.
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
      <div className="split">
        <div className="panel-elevated">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            <span className="card-title-dot" aria-hidden />
            Параметры
          </h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field">
              <span>Активный продукт</span>
              <p style={{ margin: '0 0 0.5rem', lineHeight: 1.45 }}>
                <strong>{activeProduct.name}</strong>
              </p>
              {scmMode ? (
                <>
                  <p style={{ margin: '0 0 0.35rem', fontSize: '0.82rem', lineHeight: 1.45 }}>
                    SCM:{' '}
                    <span className="mono" style={{ wordBreak: 'break-all' }}>
                      {activeProduct.repositoryUrl}
                    </span>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    ref:{' '}
                    <span className="mono">{activeProduct.repositoryRef || 'main'}</span>
                    {activeProduct.repositorySubdirectory ? (
                      <>
                        {' '}
                        · подкаталог: <span className="mono">{activeProduct.repositorySubdirectory}</span>
                      </>
                    ) : (
                      <> · подкаталог: корень клона</>
                    )}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.45 }}>
                  Путь к коду в образе (без SCM):{' '}
                  <span className="mono" style={{ wordBreak: 'break-all' }}>
                    {activeProduct.scanTargetPath}
                  </span>
                </p>
              )}
              <span className="hint" style={{ display: 'block', marginTop: 6 }}>
                Сменить продукт — в <Link to="/app/products">«Продуктах»</Link> или{' '}
                <Link to="/app/products/new">добавьте новый</Link>.
              </span>
            </div>
            <details className="field" style={{ marginTop: '-0.25rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
                {scmMode
                  ? 'Дополнительно: переопределить подкаталог внутри клона только для этого запуска'
                  : 'Дополнительно: другой каталог кода только для этого запуска'}
              </summary>
              <label className="field" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <span className="hint">
                  {scmMode
                    ? 'относительный путь от корня репозитория после clone; пусто — корень клона'
                    : 'абсолютный путь внутри среды сканирования'}
                </span>
                <input
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </details>
            {scannerId === 'semgrep' ? (
              <label className="field">
                <span>Профиль Semgrep</span>
                <span className="hint">
                  YAML или набор правил, например <code className="mono">p/java</code> (поле API:{' '}
                  <code className="mono">semgrep_config</code>)
                </span>
                <input
                  value={semgrepConfig}
                  onChange={(e) => setSemgrepConfig(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            ) : null}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Пайплайн выполняется…' : 'Запустить сценарий'}
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
              value={result ? JSON.stringify(result, null, 2) : ''}
              spellCheck={false}
            />
          </div>
        </div>
      </div>
      )}
    </PageFrame>
  )
}

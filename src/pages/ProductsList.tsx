import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIntegrationsCatalog } from '../context/IntegrationsCatalogContext'
import { PageFrame } from '../layout/PageFrame'
import { deleteProduct, listProducts, type StoredProduct } from '../lib/productsStorage'

function fmt(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

function scmSummary(p: StoredProduct): string {
  if (p.repositoryUrl?.trim()) {
    const br = p.repositoryBranchRefs?.length ? p.repositoryBranchRefs.join(', ') : p.repositoryRef || 'main'
    const sub = p.repositorySubdirectory ? ` · ${p.repositorySubdirectory}` : ''
    return `${p.repositoryUrl}\nветки: ${br}${sub}`
  }
  return `Встроенный каталог в образе: ${p.scanTargetPath}`
}

export function ProductsList() {
  const { runnableScans: scanTools } = useIntegrationsCatalog()
  const location = useLocation()
  const justCreated = !!(location.state as { justCreated?: boolean } | null)?.justCreated
  const [products, setProducts] = useState<StoredProduct[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null)
  const empty = useMemo(() => products.length === 0 && !loadErr, [products.length, loadErr])

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)
    try {
      const rows = await listProducts()
      setProducts(rows)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selectedIds = useMemo(() => products.filter((p) => selected[p.id]).map((p) => p.id), [products, selected])

  function toggleSelected(id: number) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function selectNone() {
    setSelected({})
  }

  function selectAllToggle() {
    if (products.length === 0) return
    const allOn = products.every((p) => selected[p.id])
    if (allOn) {
      selectNone()
      return
    }
    const next: Record<number, boolean> = {}
    for (const p of products) next[p.id] = true
    setSelected(next)
  }

  async function onDelete(p: StoredProduct) {
    if (!window.confirm(`Удалить продукт «${p.name}»? Связанные прогоны в отчётах сохранятся, привязка к продукту снимется.`)) {
      return
    }
    setDeleteBusyId(p.id)
    setLoadErr(null)
    try {
      await deleteProduct(p.id)
      setSelected((s) => {
        const n = { ...s }
        delete n[p.id]
        return n
      })
      await refresh()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteBusyId(null)
    }
  }

  const qProducts = encodeURIComponent(selectedIds.join(','))

  return (
    <PageFrame
      title="Продукты"
      titleAside={
        <Link to="/app/products/new" className="btn btn-primary">
          Добавить продукт
        </Link>
      }
    >
      {justCreated ? (
        <div className="msg-banner" style={{ marginBottom: '1rem' }}>
          Продукт создан и сохранён.
        </div>
      ) : null}
      {loadErr ? <p className="err">{loadErr}</p> : null}
      <div className="products-toolbar-wrap">
        <div className="products-toolbar-actions">
          <Link to="/app/report" className="btn btn-ghost">
            Отчёт по всем продуктам
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Загрузка…' : 'Обновить список'}
          </button>
          {!empty ? (
            <button type="button" className="btn btn-ghost" onClick={selectAllToggle} disabled={loading}>
              Выбрать все / снять
            </button>
          ) : null}
        </div>
        {!empty && selectedIds.length > 0 ? (
          <div className="products-toolbar-bulk">
            <span className="hint" style={{ margin: 0 }}>
              Выбрано: <strong>{selectedIds.length}</strong> — запуск очередью для каждого инструмента:
            </span>
            <div className="products-toolbar-scan-grid">
              {scanTools.map((tool) => {
                if (tool.runtime.phase !== 'ready') return null
                const path = (tool.runtime.launchAppPath ?? '').trim()
                if (!path) return null
                return (
                  <Link key={tool.id} className="btn btn-primary btn--sm" to={`${path}?products=${qProducts}`}>
                    {tool.title}
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
      {loading && products.length === 0 && !loadErr ? (
        <p style={{ color: 'var(--text-muted)' }}>Загрузка продуктов…</p>
      ) : empty ? (
        <p style={{ color: 'var(--text-muted)' }}>
          Продуктов пока нет. <Link to="/app/products/new">Создайте первый продукт</Link>.
        </p>
      ) : (
        <div className="product-cards-grid">
          {products.map((p) => {
            const hasScm = Boolean(p.repositoryUrl?.trim())
            const pidStr = encodeURIComponent(String(p.id))
            return (
              <article key={p.id} className="product-card card">
                <label className="product-card-head">
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    onChange={() => toggleSelected(p.id)}
                    aria-label={`Выбрать продукт ${p.name}`}
                  />
                  <div className="product-card-head-text">
                    <h2 className="product-card-title">{p.name}</h2>
                    <time className="product-card-created" dateTime={p.createdAt}>
                      создан {fmt(p.createdAt)}
                    </time>
                  </div>
                </label>
                {p.description.trim() ? (
                  <p className="product-card-desc">{p.description.length > 280 ? `${p.description.slice(0, 280)}…` : p.description}</p>
                ) : null}
                <pre className="product-card-scm mono">{scmSummary(p)}</pre>
                <div className="product-card-actions">
                  <div className="product-card-scan-row">
                    {scanTools.map((tool) => {
                      if (tool.runtime.phase !== 'ready') return null
                      const path = (tool.runtime.launchAppPath ?? '').trim()
                      if (!path) return null
                      return (
                        <Link
                          key={tool.id}
                          className="btn btn-primary product-card-scan-btn"
                          to={`${path}?product=${pidStr}`}
                        >
                          {tool.title}
                        </Link>
                      )
                    })}
                  </div>
                  <Link className="btn btn-report-accent product-card-report-btn" to={`/app/report?product=${pidStr}`}>
                    Отчёт по уязвимостям
                  </Link>
                  <div className="product-card-meta-row">
                    <Link className="btn btn-ghost btn--sm product-card-meta-btn" to={`/app/products/${p.id}/edit`}>
                      Изменить
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost btn--sm product-card-meta-btn product-card-delete"
                      disabled={deleteBusyId === p.id}
                      onClick={() => void onDelete(p)}
                    >
                      {deleteBusyId === p.id ? 'Удаление…' : 'Удалить'}
                    </button>
                  </div>
                </div>
                {!hasScm ? (
                  <p className="hint product-card-note">
                    Без SCM сканирование использует встроенный каталог платформы (см. поле выше).
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </PageFrame>
  )
}

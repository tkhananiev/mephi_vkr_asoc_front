import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageFrame } from '../layout/PageFrame'
import {
  getActiveProductId,
  listProducts,
  setActiveProductId,
  type StoredProduct,
} from '../lib/productsStorage'

function fmt(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

export function ProductsList() {
  const location = useLocation()
  const justCreated = !!(location.state as { justCreated?: boolean } | null)?.justCreated
  const [products, setProducts] = useState<StoredProduct[]>([])
  const [activeId, setActiveId] = useState<string | null>(() => getActiveProductId())
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const empty = useMemo(() => products.length === 0 && !loadErr, [products.length, loadErr])

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)
    try {
      const rows = await listProducts()
      setProducts(rows)
      setActiveId(getActiveProductId())
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

  function activate(id: string) {
    setActiveProductId(id)
    setActiveId(id)
  }

  return (
    <PageFrame
      eyebrow="Продукт"
      title="Продукты"
      lead="Контекст сканирования и SCM хранятся в базе и привязаны к вашей учётной записи; активный продукт сохраняется в этом браузере."
      badge="api-service"
    >
      {justCreated ? (
        <div className="msg-banner" style={{ marginBottom: '1rem' }}>
          Продукт создан и выбран активным.
        </div>
      ) : null}
      {loadErr ? <p className="err">{loadErr}</p> : null}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/app/products/new" className="btn btn-primary">
          Добавить продукт
        </Link>
        <button type="button" className="btn btn-ghost" style={{ marginLeft: '0.5rem' }} onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Загрузка…' : 'Обновить список'}
        </button>
        {activeId ? (
          <Link to="/app/scan/semgrep" className="btn btn-solid" style={{ marginLeft: '0.5rem' }}>
            Запустить SAST (активный продукт)
          </Link>
        ) : !empty ? (
          <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Выберите продукт кнопкой «Выбрать», затем можно запустить сканирование.
          </span>
        ) : null}
      </div>
      {loading && products.length === 0 && !loadErr ? (
        <p style={{ color: 'var(--text-muted)' }}>Загрузка продуктов…</p>
      ) : empty ? (
        <p style={{ color: 'var(--text-muted)' }}>
          Продуктов пока нет. <Link to="/app/products/new">Создайте первый продукт</Link>.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>SCM или путь скана</th>
                <th>Создан</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>{p.name}</div>
                    {p.description.trim() ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 320 }}>
                        {p.description.length > 120 ? `${p.description.slice(0, 120)}…` : p.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="mono" style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
                    {p.repositoryUrl?.trim() ? (
                      <>
                        <div>{p.repositoryUrl}</div>
                        <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          @{p.repositoryRef || 'main'}
                          {p.repositorySubdirectory ? ` · ${p.repositorySubdirectory}` : ''}
                        </div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>демо: {p.scanTargetPath}</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {fmt(p.createdAt)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.82rem' }}
                      onClick={() => activate(String(p.id))}
                    >
                      {activeId === String(p.id) ? 'Активный' : 'Выбрать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageFrame>
  )
}

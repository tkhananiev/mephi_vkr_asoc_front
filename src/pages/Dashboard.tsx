import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fetchCatalogStatus } from '../api/client'
import type { CatalogStatusResponse } from '../api/types'
import { IconDatabase, IconLayers, IconProducts, IconPulse, IconReport, IconScan } from '../components/Icons'
import { ensureProductsLoaded, listProducts } from '../lib/productsStorage'
import { PageFrame } from '../layout/PageFrame'

type CubeAccent = 'cyan' | 'blue' | 'indigo' | 'teal' | 'violet' | 'slate'

function productContourLabel(count: number): string {
  const n = Math.abs(Math.trunc(count))
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} продукт в контуре`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} продукта в контуре`
  return `${n} продуктов в контуре`
}

function CubeBlock({ accent, children }: { accent: CubeAccent; children: ReactNode }) {
  return <div className={`dashboard-cube-block dashboard-cube-block--${accent}`}>{children}</div>
}

export function Dashboard() {
  const [hasAnyProduct, setHasAnyProduct] = useState(false)
  const [productCount, setProductCount] = useState(0)
  const [catalog, setCatalog] = useState<CatalogStatusResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    void ensureProductsLoaded().then(() => {
      if (cancelled) return
      void listProducts().then((rows) => {
        if (cancelled) return
        setHasAnyProduct(rows.length > 0)
        setProductCount(rows.length)
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshCatalog = useCallback(async () => {
    const r = await fetchCatalogStatus()
    if (!r.ok) {
      setCatalog(null)
      return
    }
    setCatalog(r.data)
  }, [])

  useEffect(() => {
    void refreshCatalog()
    const id = window.setInterval(() => void refreshCatalog(), 30_000)
    return () => clearInterval(id)
  }, [refreshCatalog])

  const productsHref = hasAnyProduct ? '/app/products' : '/app/products/new'
  const productsSubtitle = hasAnyProduct
    ? productContourLabel(productCount)
    : 'Создайте контекст для сканирования'

  const nvd = catalog?.record_counts?.nvd ?? null
  const bdu = catalog?.record_counts?.bdu_fstec ?? null

  return (
    <PageFrame eyebrow="Atomic" title="Обзор" lead="Контур согласования находок SAST со справочниками уязвимостей и постановкой задач в трекер.">
      <section className="dashboard-cubes-section" aria-labelledby="dash-actions-heading">
        <h2 id="dash-actions-heading" className="dashboard-cubes-heading">
          Действия
        </h2>
        <div className="dashboard-cubes-grid">
          <Link to="/app/integrations" className="dashboard-cube dashboard-cube--link">
            <CubeBlock accent="cyan">
              <IconPulse className="dashboard-cube-block-icon" />
            </CubeBlock>
            <div className="dashboard-cube-text">
              <span className="dashboard-cube-title">Инструменты</span>
              <span className="dashboard-cube-desc">Каталог SAST / SCA / DAST и статус подключения</span>
            </div>
            <span className="dashboard-cube-arrow" aria-hidden>
              →
            </span>
          </Link>

          <Link to="/app/products/new" className="dashboard-cube dashboard-cube--link">
            <CubeBlock accent="blue">
              <IconProducts className="dashboard-cube-block-icon" />
            </CubeBlock>
            <div className="dashboard-cube-text">
              <span className="dashboard-cube-title">Новый продукт</span>
              <span className="dashboard-cube-desc">Имя, описание и URI репозитория SCM</span>
            </div>
            <span className="dashboard-cube-arrow" aria-hidden>
              →
            </span>
          </Link>

          <Link to={productsHref} className="dashboard-cube dashboard-cube--link">
            <CubeBlock accent="indigo">
              <IconScan className="dashboard-cube-block-icon" />
            </CubeBlock>
            <div className="dashboard-cube-text">
              <span className="dashboard-cube-title">Продукты и сканы</span>
              <span className="dashboard-cube-desc">{productsSubtitle}</span>
            </div>
            <span className="dashboard-cube-arrow" aria-hidden>
              →
            </span>
          </Link>

          <Link to="/app/report" className="dashboard-cube dashboard-cube--link">
            <CubeBlock accent="teal">
              <IconReport className="dashboard-cube-block-icon" />
            </CubeBlock>
            <div className="dashboard-cube-text">
              <span className="dashboard-cube-title">Отчёт</span>
              <span className="dashboard-cube-desc">CVE, БДУ, сканер, актив по группам</span>
            </div>
            <span className="dashboard-cube-arrow" aria-hidden>
              →
            </span>
          </Link>

          <Link to="/app/groups" className="dashboard-cube dashboard-cube--link">
            <CubeBlock accent="violet">
              <IconLayers className="dashboard-cube-block-icon" />
            </CubeBlock>
            <div className="dashboard-cube-text">
              <span className="dashboard-cube-title">Группы</span>
              <span className="dashboard-cube-desc">Доска групп и назначения</span>
            </div>
            <span className="dashboard-cube-arrow" aria-hidden>
              →
            </span>
          </Link>
        </div>
      </section>

      <section className="dashboard-cubes-section" aria-labelledby="dash-catalog-heading">
        <h2 id="dash-catalog-heading" className="dashboard-cubes-heading">
          Каталоги на платформе
        </h2>
        <div className="dashboard-cubes-grid dashboard-cubes-grid--metrics">
          <div className="dashboard-cube dashboard-cube--metric">
            <CubeBlock accent="slate">
              <IconDatabase className="dashboard-cube-block-icon" />
            </CubeBlock>
            <div className="dashboard-cube-text">
              <span className="dashboard-cube-title">NVD (CVE)</span>
              <span className="dashboard-cube-desc">Нормализованные записи после синхронизаций</span>
              <span className="dashboard-cube-metric" aria-live="polite">
                {nvd !== null ? String(nvd) : '…'}
              </span>
            </div>
          </div>
          <div className="dashboard-cube dashboard-cube--metric">
            <CubeBlock accent="slate">
              <IconDatabase className="dashboard-cube-block-icon dashboard-cube-block-icon--muted" />
            </CubeBlock>
            <div className="dashboard-cube-text">
              <span className="dashboard-cube-title">БДУ ФСТЭК</span>
              <span className="dashboard-cube-desc">Записи банка уязвимостей в контуре</span>
              <span className="dashboard-cube-metric" aria-live="polite">
                {bdu !== null ? String(bdu) : '…'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </PageFrame>
  )
}

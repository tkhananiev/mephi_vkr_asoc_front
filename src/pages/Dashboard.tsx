import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ensureProductsLoaded, getActiveProductId, listProducts } from '../lib/productsStorage'
import { PageFrame } from '../layout/PageFrame'

export function Dashboard() {
  const [hasActiveProduct, setHasActiveProduct] = useState(false)
  const [hasAnyProduct, setHasAnyProduct] = useState(false)

  useEffect(() => {
    let cancelled = false
    void ensureProductsLoaded().then(() => {
      if (cancelled) return
      void listProducts().then((rows) => {
        if (cancelled) return
        setHasActiveProduct(Boolean(getActiveProductId()))
        setHasAnyProduct(rows.length > 0)
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const sastHref = hasActiveProduct ? '/app/scan/semgrep' : hasAnyProduct ? '/app/products' : '/app/products/new'
  const sastDesc = hasActiveProduct
    ? 'Запуск Semgrep в контексте активного продукта'
    : hasAnyProduct
      ? 'Сначала выберите активный продукт в списке'
      : 'Сначала добавьте продукт (контекст сканирования)'

  return (
    <PageFrame eyebrow="Atomic" title="Обзор" lead="Контур согласования находок SAST со справочниками уязвимостей и постановкой задач в трекер." badge="ASOC">
      <div className="grid-stats">
        <Link to="/app/integrations" className="stat stat--link">
          <div className="stat-label">Инструменты</div>
          <div className="stat-desc">Каталог SAST/SCA/DAST и статус подключения</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to="/app/products/new" className="stat stat--link">
          <div className="stat-label">Добавить продукт</div>
          <div className="stat-desc">Имя, описание и URI репозитория SCM</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to={sastHref} className="stat stat--link">
          <div className="stat-label">Статический анализ (SAST)</div>
          <div className="stat-desc">{sastDesc}</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to="/app/report" className="stat stat--link">
          <div className="stat-label">Отчёт</div>
          <div className="stat-desc">Уязвимости по группам: CVE, БДУ, сканер, актив</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to="/admin/health" className="stat stat--link">
          <div className="stat-label">Сервисы</div>
          <div className="stat-desc">Быстрая проверка доступности микросервисов</div>
          <div className="stat-value">→</div>
        </Link>
        <Link to="/app/reference" className="stat stat--link">
          <div className="stat-label">Справочник</div>
          <div className="stat-desc">Синхронизация каталогов NVD и БДУ</div>
          <div className="stat-value">→</div>
        </Link>
      </div>
    </PageFrame>
  )
}

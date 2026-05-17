import type { ReactNode } from 'react'
import { useTopbarTrailing } from './TopbarTrailingContext'

export function PageFrame({
  title,
  lead,
  badge,
  eyebrow,
  children,
  brand = 'app',
}: {
  title?: string
  lead?: string
  badge?: string
  /** Короткий ярлык над заголовком */
  eyebrow?: string
  /** Верхний бар: общий («Atomic» + badge) или админ («Atomic» + таблетка Asoc как в маркировке продукта) */
  brand?: 'app' | 'admin'
  children: ReactNode
}) {
  const topbarTrailing = useTopbarTrailing()

  return (
    <>
      <header className="topbar">
        <div className="topbar-leading">
          {brand === 'admin' ? (
            <div className="topbar-left">
              <span className="topbar-atomic-banner">Atomic</span>
              <span className="topbar-asoc-banner-pill">Asoc</span>
            </div>
          ) : (
            <>
              <div className="topbar-left">Atomic</div>
              {badge ? <span className="topbar-pill">{badge}</span> : null}
            </>
          )}
        </div>
        {topbarTrailing ? <div className="topbar-trailing">{topbarTrailing}</div> : null}
      </header>
      <main className="page">
        <div className="page-hero">
          {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
          {title ? <h1 className="page-title">{title}</h1> : null}
          {lead ? <p className="page-lead">{lead}</p> : null}
        </div>
        {children}
      </main>
    </>
  )
}

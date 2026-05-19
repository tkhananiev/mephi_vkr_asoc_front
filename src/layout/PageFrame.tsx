import type { ReactNode } from 'react'
import { useTopbarTrailing } from './TopbarTrailingContext'

export function PageFrame({
  title,
  lead,
  eyebrow,
  titleAside,
  children,
}: {
  title?: string
  lead?: string
  /** Короткий ярлык над заголовком страницы */
  eyebrow?: string
  /** Блок справа от заголовка (например основная кнопка на странице). */
  titleAside?: ReactNode
  children: ReactNode
}) {
  const topbarTrailing = useTopbarTrailing()

  return (
    <>
      <header className="topbar">
        <div className="topbar-leading">
          <div className="topbar-left">
            <span className="topbar-atomic-banner">Atomic</span>
            <span className="topbar-asoc-banner-pill">ASOC</span>
          </div>
        </div>
        {topbarTrailing ? <div className="topbar-trailing">{topbarTrailing}</div> : null}
      </header>
      <main className="page">
        <div className="page-hero">
          {titleAside != null ? (
            <div className="page-hero-head page-hero-head--split">
              <div className="page-hero-text">
                {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
                {title ? <h1 className="page-title">{title}</h1> : null}
              </div>
              <div className="page-hero-actions">{titleAside}</div>
            </div>
          ) : (
            <>
              {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
              {title ? <h1 className="page-title">{title}</h1> : null}
            </>
          )}
          {lead ? <p className="page-lead">{lead}</p> : null}
        </div>
        {children}
      </main>
    </>
  )
}

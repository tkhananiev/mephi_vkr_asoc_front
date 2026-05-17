import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AuthModal } from '../components/AuthModal'
import { AuthShell } from '../components/AuthShell'

/** Маркетинговый экран в духе продуктовых лендингов (напр. Semgrep): центр — виджеты, вход/регистрация — модалки. */
export function MarketingLanding() {
  const bars = [42, 68, 55, 82, 61, 74, 49]
  const ringPct = 73

  return (
    <AuthShell>
      <>
        <div className="marketing-body">
          <section className="marketing-hero">
            <h2 className="marketing-headline">
              Уязвимости под контролем{' '}
              <span className="marketing-headline-accent">от разработки до продакшена</span>
            </h2>
            <p className="marketing-sub">
              Корреляция CVE и БДУ ФСТЭК, сканеры SAST и постановка задач — единая консоль Atomic ASOC для вашего
              контура.
            </p>
            <div className="marketing-hero-cta">
              <Link className="btn btn-primary" to={{ pathname: '/', search: '?auth=login' }}>
                Войти
              </Link>
              <Link className="btn btn-ghost" to={{ pathname: '/', search: '?auth=register' }}>
                Регистрация
              </Link>
            </div>
          </section>

          <section className="marketing-widgets" aria-label="Обзор возможностей">
            <article className="marketing-widget card panel-elevated">
              <p className="marketing-widget-slogan">Национальная база уязвимостей ФСТЭК России</p>
              <p className="marketing-widget-hook">
                Данные БДУ рядом с CVE/NVD и CWE — без отдельных «табличек» и ручной сверки источников.
              </p>
              <div className="marketing-chart marketing-chart--bars">
                {bars.map((h, i) => (
                  <div key={i} className="marketing-chart-bar-wrap">
                    <div className="marketing-chart-bar" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="marketing-widget-footer">
                <span className="marketing-pill marketing-pill--cve">БДУ · CVE</span>
                <span className="marketing-pill marketing-pill--muted">единый контур данных</span>
              </div>
            </article>

            <article className="marketing-widget card panel-elevated">
              <p className="marketing-widget-slogan">Экономия времени DevSecOps и разработчиков</p>
              <p className="marketing-widget-hook">
                Статический анализ и поиск секретов под рукой — меньше прыжков между консолями и чатами.
              </p>
              <div className="marketing-donut" style={{ '--pct': ringPct } as CSSProperties}>
                <span className="marketing-donut-label">{ringPct}%</span>
              </div>
              <ul className="marketing-mini-list">
                <li>SAST · Semgrep</li>
                <li>Секреты · Gitleaks</li>
                <li>Ориентиры OWASP ASVS в одном месте</li>
              </ul>
            </article>

            <article className="marketing-widget card panel-elevated marketing-widget--wide">
              <p className="marketing-widget-slogan">
                Корреляция однотипных уязвимостей в единую задачу на устранение
              </p>
              <p className="marketing-widget-hook">
                Группы находок → понятный приоритет → тикет в Jira: меньше дублей и переписки «кто это возьмёт».
              </p>
              <div className="marketing-spark">
                {[28, 44, 38, 52, 48, 61, 55, 67, 62, 58, 71, 69].map((v, i) => (
                  <div key={i} className="marketing-spark-cell" style={{ height: `${v}%` }} />
                ))}
              </div>
              <div className="marketing-progress-stack">
                <div className="marketing-progress-row">
                  <span>БДУ ФСТЭК</span>
                  <div className="marketing-progress">
                    <div className="marketing-progress-fill marketing-progress-fill--bdu" style={{ width: '78%' }} />
                  </div>
                </div>
                <div className="marketing-progress-row">
                  <span>NVD</span>
                  <div className="marketing-progress">
                    <div className="marketing-progress-fill marketing-progress-fill--nvd" style={{ width: '64%' }} />
                  </div>
                </div>
                <div className="marketing-progress-row">
                  <span>Jira</span>
                  <div className="marketing-progress">
                    <div className="marketing-progress-fill marketing-progress-fill--jira" style={{ width: '52%' }} />
                  </div>
                </div>
              </div>
            </article>
          </section>
        </div>

        <AuthModal />
      </>
    </AuthShell>
  )
}

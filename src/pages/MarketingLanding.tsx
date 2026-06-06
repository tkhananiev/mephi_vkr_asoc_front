import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { AuthModal } from '../components/AuthModal'
import { AuthShell } from '../components/AuthShell'
function LandingHeroVisual() {
  return (
    <div className="landing-hero-visual" aria-hidden>
      <div className="landing-hero-atom">
        <BrandLogo size={280} />
      </div>
    </div>
  )
}

export function MarketingLanding() {
  return (
    <AuthShell>
      <>
        <div className="landing-page">
          <nav className="landing-anchor-nav" aria-label="Разделы лендинга">
            <a href="#features">Возможности</a>
            <span className="landing-anchor-sep" aria-hidden>
              ·
            </span>
            <a href="#compare">Сравнение с DefectDojo</a>
          </nav>

          <section className="landing-hero">
            <div className="landing-hero-grid">
              <div className="landing-hero-copy">
                <p className="landing-overline">ATOMIC ASOC VS DEFECTDOJO</p>
                <h1 className="landing-title">Надёжный контур ASOC для разработки и управления уязвимостями</h1>
                <p className="landing-lead">
                  Единая консоль: корреляция <strong>NVD/CVE</strong> и <strong>БДУ ФСТЭК</strong>, нормализация находок,
                  SAST (Semgrep) и поиск секретов (Gitleaks), группы и отчёты — масштаб и способ эксплуатации определяете
                  вы, без навязанной аппаратной или оркестраторной модели на уровне продукта.
                </p>
                <div className="landing-hero-cta">
                  <Link className="landing-btn landing-btn--primary" to={{ pathname: '/', search: '?auth=login' }}>
                    Перейти в консоль →
                  </Link>
                  <Link className="landing-btn landing-btn--ghost" to={{ pathname: '/', search: '?auth=register' }}>
                    Регистрация
                  </Link>
                </div>
              </div>
              <LandingHeroVisual />
            </div>
          </section>

          <section id="features" className="landing-cards-section" aria-labelledby="landing-features-title">
            <h2 id="landing-features-title" className="landing-section-title">
              Почему Atomic ASOC
            </h2>
            <div className="landing-cards">
              <article className="landing-card">
                <div className="landing-card-icon landing-card-icon--stack" aria-hidden />
                <h3 className="landing-card-title">Открытый контур</h3>
                <p className="landing-card-body">
                  Исходный код и воспроизводимая сборка: микросервисы на Go, общая PostgreSQL, Kafka для ingest, UI на React —
                  удобно для доработки под вашу инфраструктуру.
                </p>
                <p className="landing-card-accent">Прозрачная архитектура и контроль данных на своей площадке</p>
              </article>
              <article className="landing-card">
                <div className="landing-card-icon landing-card-icon--pipeline" aria-hidden />
                <h3 className="landing-card-title">Интеграция с CI/CD</h3>
                <p className="landing-card-body">
                  Приём нормализованных находок по REST, запуск сценариев сканирования по API, привязка прогонов к продукту
                  в консоли — единый поток для ручных и автоматических проверок.
                </p>
                <p className="landing-card-accent">Непрерывный контроль уязвимостей в релизном цикле</p>
              </article>
              <article className="landing-card">
                <div className="landing-card-icon landing-card-icon--scan" aria-hidden />
                <h3 className="landing-card-title">Каталог сканеров</h3>
                <p className="landing-card-body">
                  Расширяемый каталог интеграций: Semgrep, Gitleaks и единый API оркестрации; нормализация перед записью в
                  processing и выдача в отчёт.
                </p>
                <p className="landing-card-accent">Один проход данных от скана до тикета и отчёта</p>
              </article>
            </div>
          </section>

          <section id="compare" className="landing-compare-section" aria-labelledby="landing-compare-title">
            <h2 id="landing-compare-title" className="landing-section-title">
              В чём разница?
            </h2>
            <div className="landing-compare-table-wrap landing-compare-table-wrap--marketing">
              <div
                className="landing-compare-matrix"
                role="table"
                aria-label="Сравнение Atomic ASOC и DefectDojo"
              >
                <div className="landing-compare-matrix__row landing-compare-matrix__row--logos" role="row">
                  <div className="landing-compare-matrix__corner" role="columnheader" aria-hidden />
                  <div className="landing-compare-matrix__col" role="columnheader">
                    <BrandLogo size={48} />
                  </div>
                  <div className="landing-compare-matrix__col" role="columnheader">
                    <span className="landing-compare-dojo-mark" aria-hidden>
                      d
                    </span>
                  </div>
                </div>
                <div className="landing-compare-matrix__row landing-compare-matrix__row--brands" role="row">
                  <div className="landing-compare-matrix__corner" role="columnheader" aria-hidden />
                  <div className="landing-compare-matrix__col" role="columnheader">
                    <span className="landing-compare-brand landing-compare-brand--atomic">Atomic ASOC</span>
                  </div>
                  <div className="landing-compare-matrix__col" role="columnheader">
                    <span className="landing-compare-brand landing-compare-brand--dojo">DefectDojo</span>
                  </div>
                </div>
                <div className="landing-compare-matrix__row" role="row">
                  <div className="landing-compare-matrix__label" role="rowheader">
                    Цена
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    Бесплатно
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    Бесплатно
                  </div>
                </div>
                <div className="landing-compare-matrix__row" role="row">
                  <div className="landing-compare-matrix__label" role="rowheader">
                    Оркестрация сканерами
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-ok" aria-hidden />
                    <span>По API</span>
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-no" aria-hidden />
                    <span>Нет, только отчёты</span>
                  </div>
                </div>
                <div className="landing-compare-matrix__row" role="row">
                  <div className="landing-compare-matrix__label" role="rowheader">
                    Кастомизация из коробки
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-ok" aria-hidden />
                    <span>Да</span>
                  </div>
                  <div className="landing-compare-matrix__val landing-compare-matrix__val--wrap" role="cell">
                    <span className="landing-ruble" aria-hidden />
                    <span>Требует доработки</span>
                  </div>
                </div>
                <div className="landing-compare-matrix__row" role="row">
                  <div className="landing-compare-matrix__label" role="rowheader">
                    Высокая производительность
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-ok" aria-hidden />
                    <span>Из коробки</span>
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-no" aria-hidden />
                    <span>Нет</span>
                  </div>
                </div>
                <div className="landing-compare-matrix__row" role="row">
                  <div className="landing-compare-matrix__label" role="rowheader">
                    Продвинутые сценарии автоматизации
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-ok" aria-hidden />
                    <span>Из коробки</span>
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-no" aria-hidden />
                    <span>Нет</span>
                  </div>
                </div>
                <div className="landing-compare-matrix__row landing-compare-matrix__row--last" role="row">
                  <div className="landing-compare-matrix__label" role="rowheader">
                    Работа с БДУ ФСТЭК
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-ok" aria-hidden />
                    <span>Да</span>
                  </div>
                  <div className="landing-compare-matrix__val" role="cell">
                    <span className="landing-no" aria-hidden />
                    <span>Нет</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="landing-compare-footnote">
              DefectDojo —{' '}
              <a href="https://github.com/DefectDojo/django-DefectDojo" target="_blank" rel="noreferrer">
                open-source
              </a>{' '}
              платформа импорта отчётов; сравнение по ключевым возможностям для контура DevSecOps.
            </p>
          </section>

          <footer className="landing-foot">
            <p>
              Atomic ASOC — централизованная консоль для управления результатами анализа и уязвимостями в контуре
              разработки. Открытый исходный код; сборка и эксплуатация — на вашей стороне.
            </p>
          </footer>
        </div>

        <AuthModal />
      </>
    </AuthShell>
  )
}

import { Link, NavLink } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

/** Ссылки на каталоги и стандарты, с которыми стыкуется консоль (документация / первоисточники). */
const STANDARDS_LINKS = [
  { label: 'CVE', href: 'https://www.cve.org/', title: 'Common Vulnerabilities and Exposures' },
  { label: 'NVD', href: 'https://nvd.nist.gov/', title: 'National Vulnerability Database (NIST)' },
  { label: 'CWE', href: 'https://cwe.mitre.org/', title: 'Common Weakness Enumeration' },
  { label: 'БДУ ФСТЭК', href: 'https://bdu.fstec.ru/', title: 'Банк данных уязвимостей ФСТЭК России' },
  {
    label: 'OWASP ASVS',
    href: 'https://owasp.org/www-project-application-security-verification-standard/',
    title: 'Application Security Verification Standard',
  },
  {
    label: 'SAST',
    href: 'https://owasp.org/www-community/Source_Code_Analysis_Tools',
    title: 'Статический анализ кода (обзор OWASP)',
  },
  { label: 'SBOM', href: 'https://cyclonedx.org/', title: 'Software Bill of Materials (CycloneDX)' },
  {
    label: 'HTTP / REST',
    href: 'https://www.rfc-editor.org/rfc/rfc9110.html',
    title: 'RFC 9110 — HTTP semantics (основа REST API)',
  },
] as const

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <header className="auth-shell-topbar">
        <Link className="auth-shell-brand auth-shell-brand-link" to="/">
          <BrandLogo size={44} />
          <div className="auth-shell-brand-text">
            <span className="auth-shell-product">Atomic ASOC</span>
            <span className="auth-shell-tagline">консоль управления уязвимостями</span>
          </div>
        </Link>
        <nav className="auth-shell-nav" aria-label="Вход и регистрация">
          <NavLink
            to={{ pathname: '/', search: '?auth=login' }}
            className={({ isActive }) => `btn auth-shell-nav-btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          >
            Войти
          </NavLink>
          <NavLink
            to={{ pathname: '/', search: '?auth=register' }}
            className={({ isActive }) => `btn auth-shell-nav-btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
          >
            Регистрация
          </NavLink>
        </nav>
      </header>

      <section className="auth-shell-widgets" aria-label="Каталоги и стандарты">
        <p className="auth-shell-widgets-lead">
          Консоль стыкуется с открытыми каталогами уязвимостей и распространёнными практиками безопасности — см.
          первоисточники:
        </p>
        <p className="auth-shell-widgets-links">
          {STANDARDS_LINKS.map((item, i) => (
            <span key={item.href} className="auth-shell-widgets-link-wrap">
              {i > 0 ? <span className="auth-shell-widgets-sep" aria-hidden="true">·</span> : null}
              <a href={item.href} target="_blank" rel="noopener noreferrer" title={item.title}>
                {item.label}
              </a>
            </span>
          ))}
        </p>
      </section>

      <main className="auth-shell-main">{children}</main>
    </div>
  )
}

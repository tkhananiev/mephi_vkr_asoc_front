import { Link, NavLink } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

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

      <main className="auth-shell-main">{children}</main>
    </div>
  )
}

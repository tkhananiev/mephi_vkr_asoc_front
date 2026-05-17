import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import {
  IconBook,
  IconDashboard,
  IconDatabase,
  IconFolderGit,
  IconLayers,
  IconPulse,
  IconReport,
  IconScan,
} from '../components/Icons'
import { SidebarFooterUser } from './SidebarFooterUser'

const topNav: { to: string; label: string; end?: boolean; icon: ReactNode }[] = [
  { to: '/app', label: 'Обзор', end: true, icon: <IconDashboard className="nav-icon" /> },
  { to: '/app/report', label: 'Отчёт по уязвимостям', icon: <IconReport className="nav-icon" /> },
  { to: '/app/reference', label: 'Справочник', icon: <IconDatabase className="nav-icon" /> },
  { to: '/app/groups', label: 'Группы', icon: <IconLayers className="nav-icon" /> },
]

const sastSub: { to: string; label: string }[] = [
  { to: '/app/scan/semgrep', label: 'Статический анализ кода' },
  { to: '/app/scan/gitleaks', label: 'Поиск секретов (Gitleaks)' },
]

export function AppShell() {
  const loc = useLocation()
  const sastSection = loc.pathname.startsWith('/app/scan')

  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLogo size={40} />
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">Atomic</div>
            <div className="sidebar-brand-sub">Центральный контур управления безопасностью ПО</div>
          </div>
        </div>
        <nav>
          <NavLink
            to="/app"
            end
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <IconDashboard className="nav-icon" />
            Обзор
          </NavLink>

          <NavLink
            to="/app/products/new"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <IconFolderGit className="nav-icon" />
            Добавить продукт
          </NavLink>

          <NavLink
            to="/app/integrations"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <IconPulse className="nav-icon" />
            Инструменты
          </NavLink>

          <div className={'nav-group' + (sastSection ? ' nav-group--active' : '')}>
            <div className="nav-group-label">
              <IconScan className="nav-icon" />
              SAST
            </div>
            {sastSub.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 'nav-link nav-sublink' + (isActive ? ' active' : '')}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {topNav.slice(1).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end === true}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          <NavLink to="/app/guide" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <IconBook className="nav-icon" />
            Руководство пользователя
          </NavLink>
        </nav>
        <div className="sidebar-footer sidebar-footer--stack">
          <SidebarFooterUser />
          <span className="sidebar-footer-hint">прокси <code>/api</code></span>
        </div>
      </aside>
      <div className="main-wrap">
        <Outlet />
      </div>
    </div>
  )
}

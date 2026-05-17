import { NavLink, Outlet } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { IconBook, IconDashboard, IconPulse, IconScan, IconUsers } from '../components/Icons'
import { SidebarFooterAdmin } from './SidebarFooterAdmin'

export function AdminShell() {
  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLogo size={40} />
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-duo">
              <span className="sidebar-brand-atomic-inline">Atomic</span>
              <span className="sidebar-brand-asoc-inline-pill">Asoc</span>
            </div>
            <div className="sidebar-brand-sub">Консоль Администратора</div>
          </div>
        </div>
        <nav>
          <NavLink
            to="/asoc-admin/dashboard"
            end
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <IconDashboard className="nav-icon" />
            Обзор
          </NavLink>
          <NavLink to="/asoc-admin/users" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <IconUsers className="nav-icon" />
            Пользователи
          </NavLink>
          <NavLink to="/asoc-admin/scanners" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <IconScan className="nav-icon" />
            Инструменты
          </NavLink>
          <NavLink to="/asoc-admin/health" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <IconPulse className="nav-icon" />
            Сервисы (health)
          </NavLink>
          <NavLink to="/asoc-admin/guide" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <IconBook className="nav-icon" />
            Руководство администратора
          </NavLink>
        </nav>
        <div className="sidebar-footer sidebar-footer--stack">
          <SidebarFooterAdmin />
        </div>
      </aside>
      <div className="main-wrap">
        <Outlet />
      </div>
    </div>
  )
}

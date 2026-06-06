import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import {
  IconBook,
  IconDashboard,
  IconLayers,
  IconProducts,
  IconPulse,
} from '../components/Icons'
import { SidebarFooterUser } from './SidebarFooterUser'

export function AppShell() {
  const loc = useLocation()
const productsSubgroupActive =
    loc.pathname.startsWith('/app/products') ||
    loc.pathname.startsWith('/app/scan') ||
    loc.pathname.startsWith('/app/report')
  const groupsSubgroupActive = loc.pathname.startsWith('/app/groups')
  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLogo size={40} />
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-duo">
              <span className="sidebar-brand-atomic-inline">Atomic</span>
              <span className="sidebar-brand-asoc-inline-pill">ASOC</span>
            </div>
            <div className="sidebar-brand-sub">Центральный контур управления безопасностью ПО</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/app"
            end
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <IconDashboard className="nav-icon" />
            Обзор
          </NavLink>

          <div className={'nav-group nav-group-products' + (productsSubgroupActive ? ' nav-group--active' : '')}>
            <NavLink
              to="/app/products"
              className={
                'nav-link nav-link--products-only' + (productsSubgroupActive ? ' active' : '')
              }
            >
              <IconProducts className="nav-icon nav-icon--group" />
              Продукты
            </NavLink>
          </div>

          <NavLink
            to="/app/integrations"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <IconPulse className="nav-icon" />
            Инструменты
          </NavLink>

          <div className={'nav-group nav-group-groups' + (groupsSubgroupActive ? ' nav-group--active' : '')}>
            <NavLink
              to="/app/groups"
              end
              className={({ isActive }) =>
                'nav-link nav-link--groups-root' + (isActive && loc.pathname === '/app/groups' ? ' active' : groupsSubgroupActive ? ' active' : '')
              }
            >
              <IconLayers className="nav-icon nav-icon--group" />
              Группы
            </NavLink>
            <NavLink
              to="/app/groups/false-positive"
              className={({ isActive }) => 'nav-link nav-sublink' + (isActive ? ' active' : '')}
            >
              False positive
            </NavLink>
            <NavLink
              to="/app/groups/risk-accepted"
              className={({ isActive }) => 'nav-link nav-sublink' + (isActive ? ' active' : '')}
            >
              Risk accepted
            </NavLink>
          </div>

          <NavLink to="/app/guide" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <IconBook className="nav-icon" />
            Руководство пользователя
          </NavLink>
        </nav>
        <div className="sidebar-footer sidebar-footer--stack">
          <SidebarFooterUser />
        </div>
      </aside>
      <div className="main-wrap">
        <Outlet />
      </div>
    </div>
  )
}

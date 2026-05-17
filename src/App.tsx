import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './layout/AdminShell'
import { AppShell } from './layout/AppShell'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminHandbook } from './pages/AdminHandbook'
import { AdminHealth } from './pages/AdminHealth'
import { AdminScannerCatalog } from './pages/AdminScannerCatalog'
import { AdminUsers } from './pages/AdminUsers'
import { Dashboard } from './pages/Dashboard'
import { Integrations } from './pages/Integrations'
import { GroupsBoard } from './pages/GroupsBoard'
import { HomeEntry, LoginEntry, RegisterEntry } from './pages/HomeEntry'
import { SastScanLayout } from './layout/SastScanLayout'
import { ReferenceSync } from './pages/ReferenceSync'
import { ProductCreate } from './pages/ProductCreate'
import { ProductsList } from './pages/ProductsList'
import { ScanRun } from './pages/ScanRun'
import { UserHandbook } from './pages/UserHandbook'
import { VulnerabilityReport } from './pages/VulnerabilityReport'
import { SessionLifecycle } from './session/SessionLifecycle'
import { AdminProtectedRoute } from './routes/AdminProtectedRoute'
import { NavigateLoginFresh } from './routes/NavigateLoginFresh'
import { ProtectedRoute } from './routes/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <SessionLifecycle />
      <Routes>
        <Route path="/" element={<HomeEntry />} />

        <Route path="/login" element={<LoginEntry />} />
        <Route path="/register" element={<RegisterEntry />} />
        <Route path="/verify-email" element={<Navigate to={{ pathname: '/', search: '?auth=login' }} replace />} />
        <Route path="/asoc-admin/login" element={<NavigateLoginFresh />} />

        <Route path="/admin/health" element={<Navigate to="/asoc-admin/health" replace />} />
        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminShell />}>
            <Route path="/asoc-admin/dashboard" element={<AdminDashboard />} />
            <Route path="/asoc-admin/users" element={<AdminUsers />} />
            <Route path="/asoc-admin/scanners" element={<AdminScannerCatalog />} />
            <Route path="/asoc-admin/guide" element={<AdminHandbook />} />
            <Route path="/asoc-admin/health" element={<AdminHealth />} />
          </Route>
        </Route>
        <Route path="/asoc-admin" element={<Navigate to="/asoc-admin/dashboard" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="products/new" element={<ProductCreate />} />
            <Route path="products" element={<ProductsList />} />
            <Route path="projects/new" element={<Navigate to="/app/products/new" replace />} />
            <Route path="projects" element={<Navigate to="/app/products" replace />} />
            <Route path="scan" element={<SastScanLayout />}>
              <Route index element={<Navigate to="semgrep" replace />} />
              <Route path="semgrep" element={<ScanRun scannerId="semgrep" />} />
              <Route path="gitleaks" element={<ScanRun scannerId="gitleaks" />} />
            </Route>
            <Route path="report" element={<VulnerabilityReport />} />
            <Route path="reference" element={<ReferenceSync />} />
            <Route path="groups" element={<GroupsBoard />} />
            <Route path="guide" element={<UserHandbook />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { AdminHealth } from './pages/AdminHealth'
import { Dashboard } from './pages/Dashboard'
import { GroupsBoard } from './pages/GroupsBoard'
import { ReferenceSync } from './pages/ReferenceSync'
import { ScanRun } from './pages/ScanRun'
import { VulnerabilityReport } from './pages/VulnerabilityReport'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="scan" element={<ScanRun />} />
          <Route path="report" element={<VulnerabilityReport />} />
          <Route path="reference" element={<ReferenceSync />} />
          <Route path="groups" element={<GroupsBoard />} />
          <Route path="admin/health" element={<AdminHealth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

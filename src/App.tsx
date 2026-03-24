import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { StatusChip } from '@/components/ui/StatusChip'
import { TabBar } from '@/components/layout/TabBar'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { Today } from '@/pages/Today'
import { DailyReport } from '@/pages/DailyReport'
import { Reports } from '@/pages/Reports'
import { Export } from '@/pages/Export'
import { Settings } from '@/pages/Settings'
import { Login } from '@/pages/Login'

// ─── Inner layout (needs router context) ─────────────────────────────────────

function AppLayout() {
  const location = useLocation()
  const { isOnline } = useOfflineStatus()
  const isLoginPage = location.pathname === '/login'

  return (
    <div className="min-h-screen bg-surface">
      {/* Status chip — shown in top-right corner, outside login */}
      {!isLoginPage && (
        <div className="fixed top-safe top-3 right-3 z-50"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <StatusChip isOnline={isOnline} />
        </div>
      )}

      {/* Page content */}
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/report/new" element={<DailyReport />} />
        <Route path="/report/:id" element={<DailyReport />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/export" element={<Export />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
      </Routes>

      {/* Bottom tab bar — hidden on login */}
      {!isLoginPage && <TabBar />}
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter basename="/Field-production-crew-time-log">
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App

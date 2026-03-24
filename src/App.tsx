import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { StatusChip } from '@/components/ui/StatusChip'
import { TabBar } from '@/components/layout/TabBar'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { Today } from '@/pages/Today'
import { DailyReport } from '@/pages/DailyReport'
import { Reports } from '@/pages/Reports'
import { Export } from '@/pages/Export'
import { Settings } from '@/pages/Settings'
import { Login } from '@/pages/Login'
import { CrewRoster } from '@/pages/admin/CrewRoster'
import { Sites } from '@/pages/admin/Sites'
import { ActivityTypes } from '@/pages/admin/ActivityTypes'
import { getCurrentUser } from '@/utils/auth'

// ─── Route guards ─────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

// ─── Inner layout (needs router + toast context) ──────────────────────────────

function AppLayout() {
  const location = useLocation()
  const { showToast } = useToast()
  const isLoginPage = location.pathname === '/login'

  const { isOnline } = useOfflineStatus({
    onOnline: () => showToast('Back online', 'success'),
    onOffline: () => showToast('You\'re offline — data will be saved locally', 'warning'),
  })

  return (
    <div className="min-h-screen bg-surface">
      {/* Offline banner — amber bar at the very top */}
      {!isOnline && !isLoginPage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-xs font-bold text-center py-1.5 px-4 tracking-wide"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 6px)' }}
        >
          Offline — saving locally
        </div>
      )}

      {/* Status chip — shown in top-right corner, outside login */}
      {!isLoginPage && (
        <div
          className="fixed right-3 z-50"
          style={{
            top: isOnline
              ? 'calc(env(safe-area-inset-top, 0px) + 12px)'
              : 'calc(env(safe-area-inset-top, 0px) + 34px)',
          }}
        >
          <StatusChip isOnline={isOnline} />
        </div>
      )}

      {/* Page content */}
      <Routes>
        <Route path="/" element={<RequireAuth><Today /></RequireAuth>} />
        <Route path="/report/new" element={<RequireAuth><DailyReport /></RequireAuth>} />
        <Route path="/report/:id" element={<RequireAuth><DailyReport /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/export" element={<RequireAuth><Export /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/admin/crew" element={<RequireAdmin><CrewRoster /></RequireAdmin>} />
        <Route path="/admin/sites" element={<RequireAdmin><Sites /></RequireAdmin>} />
        <Route path="/admin/activities" element={<RequireAdmin><ActivityTypes /></RequireAdmin>} />
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

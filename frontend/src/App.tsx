import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MissionsPage } from './pages/MissionsPage'
import { NewMissionPage } from './pages/NewMissionPage'
import { MissionDetailPage } from './pages/MissionDetailPage'
import { LeadsPage } from './pages/LeadsPage'
import { LeadDetailPage } from './pages/LeadDetailPage'
import { ResearchPage } from './pages/ResearchPage'
import { OutreachPage } from './pages/OutreachPage'
import { FollowUpsPage } from './pages/FollowUpsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { InsightsPage } from './pages/InsightsPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { ActivityPage } from './pages/ActivityPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-3 text-ink-3">
        <span className="size-4 animate-spin rounded-full border-[1.5px] border-ink-4 border-t-accent" />
        <span className="text-[13px]">Loading workspace…</span>
      </div>
    </div>
  )
}

function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout />
}

function LoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (user) return <Navigate to="/dashboard" replace />
  return <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/missions" element={<MissionsPage />} />
            <Route path="/missions/new" element={<NewMissionPage />} />
            <Route path="/missions/:id" element={<MissionDetailPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/outreach" element={<OutreachPage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}

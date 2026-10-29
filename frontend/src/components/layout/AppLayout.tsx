import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const { user, workspace } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: provider } = useApi<{ provider: string; mode: 'live' | 'demo'; model: string }>(
    '/api/provider',
  )

  if (!user || !workspace) return null

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-[232px] shrink-0 border-r border-line lg:block">
        <div className="fixed inset-y-0 left-0 w-[232px]">
          <Sidebar user={user} workspace={workspace} />
        </div>
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-canvas-deep/70 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-in-up absolute inset-y-0 left-0 w-[248px] border-r border-line shadow-[0_0_60px_-10px_rgba(16,22,20,0.18)]">
            <Sidebar
              user={user}
              workspace={workspace}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          provider={provider ? { mode: provider.mode, model: provider.model } : null}
          onMenu={() => setDrawerOpen(true)}
        />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

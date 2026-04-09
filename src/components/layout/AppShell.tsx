import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-64">
        <div className="min-h-screen p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
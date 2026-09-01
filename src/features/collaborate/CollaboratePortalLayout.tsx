import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Fingerprint } from 'lucide-react'

export function CollaboratePortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-primary-foreground" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Mis colaboraciones</p>
              <p className="text-xs text-muted-foreground">DetectiveOS</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                {user?.displayName?.[0] ?? '?'}
              </div>
            )}
            <p className="text-sm text-foreground hidden sm:block">
              {user?.displayName ?? user?.email}
            </p>
            <button
              onClick={handleLogout}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

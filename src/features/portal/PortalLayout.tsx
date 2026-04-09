import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut } from 'lucide-react'

export function PortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/portal')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white text-sm font-bold">D</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Portal cliente</p>
              <p className="text-xs text-slate-500">DetectiveOS</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                {user?.displayName?.[0] ?? '?'}
              </div>
            )}
            <p className="text-sm text-slate-700 hidden sm:block">
              {user?.displayName ?? user?.email}
            </p>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
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
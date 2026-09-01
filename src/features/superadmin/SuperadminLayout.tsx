import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ScrollText,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/superadmin' },
  { label: 'Despachos', icon: Building2, to: '/superadmin/firms' },
  { label: 'Planes', icon: CreditCard, to: '/superadmin/plans' },
  { label: 'Auditoría', icon: ScrollText, to: '/superadmin/audit' },
]

export function SuperadminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-muted flex">

      {/* Sidebar */}
      <aside className="w-56 bg-sidebar flex flex-col shrink-0 fixed inset-y-0 left-0">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-gold text-brand-gold-foreground shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.25} />
            </div>
            <span className="text-sidebar-foreground font-semibold text-sm">
              Superadmin
            </span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/superadmin'}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-brand-gold" />
                      )}
                      <item.icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-3 py-2 mb-0.5">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full shrink-0 ring-1 ring-sidebar-border" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center text-xs text-brand-gold-foreground font-medium shrink-0">
                {user?.displayName?.[0] ?? 'S'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-foreground/90 truncate">
                {user?.displayName ?? user?.email ?? '—'}
              </p>
              <p className="text-xs text-brand-gold">Superadmin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 pl-56 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  BookOpen,
  ShieldCheck,
  FileSearch,
  Handshake,
  Building2,
  Settings,
  LogOut,
  ChevronRight,
  Inbox,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: ROUTES.DASHBOARD,
  },
  {
    label: 'Solicitudes',
    icon: Inbox,
    to: ROUTES.LEADS,
  },
  {
    label: 'Clientes',
    icon: Users,
    to: ROUTES.CLIENTS,
  },
  {
    label: 'Pre-expedientes',
    icon: FileSearch,
    to: ROUTES.PRE_CASES,
  },
  {
    label: 'Expedientes',
    icon: FolderOpen,
    to: ROUTES.CASES,
  },
  {
    label: 'Libro-registro',
    icon: BookOpen,
    to: ROUTES.REGISTRY_BOOK,
  },
  {
    label: 'Contratos',
    icon: FileText,
    to: ROUTES.CONTRACTS,
  },
  {
    label: 'Informes',
    icon: FileText,
    to: ROUTES.REPORTS,
  },
  {
    label: 'Cumplimiento',
    icon: ShieldCheck,
    to: ROUTES.COMPLIANCE,
  },
  {
    label: 'Colaboradores',
    icon: Handshake,
    to: ROUTES.COLLABORATORS,
  },
  {
    label: 'Equipo',
    icon: Building2,
    to: ROUTES.TEAM,
  },
]

export function AppSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="text-white font-semibold text-sm tracking-wide">
          DetectiveOS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3 space-y-0.5">
        <NavLink
          to={ROUTES.SETTINGS}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            )
          }
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </NavLink>

        <div className="flex items-center gap-3 px-3 py-2">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? ''}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
              {user?.displayName?.[0] ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">
              {user?.displayName ?? user?.email ?? '—'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
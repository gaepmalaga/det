import { NavLink, useNavigate } from 'react-router-dom'
import {
  Sun,
  Archive,
  Users,
  BookOpen,
  ShieldCheck,
  Handshake,
  Building2,
  Settings,
  LogOut,
  X,
  Fingerprint,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

// Seis destinos, no uno por colección de la base de datos. Un contrato o
// un informe no son sitios a los que se va: son papeles de un asunto, y se
// ven dentro de él. Lo que sí es un sitio es el día de hoy, el archivo del
// despacho y la gente que todavía no ha contratado.
const navItems = [
  { label: 'Hoy', icon: Sun, to: ROUTES.TODAY },
  { label: 'Archivo', icon: Archive, to: ROUTES.ARCHIVE },
  { label: 'Oportunidades', icon: Handshake, to: ROUTES.OPPORTUNITIES },
  { label: 'Clientes', icon: Users, to: ROUTES.CLIENTS },
  { label: 'Colaboradores', icon: Building2, to: ROUTES.COLLABORATORS },
]

// Fuera del bloque principal: se consultan de vez en cuando, no se
// trabajan a diario.
const secondaryItems = [
  { label: 'Libro-registro', icon: BookOpen, to: ROUTES.REGISTRY_BOOK },
  { label: 'Cumplimiento', icon: ShieldCheck, to: ROUTES.COMPLIANCE },
  { label: 'Estadísticas', icon: TrendingUp, to: ROUTES.STATS },
]

interface AppSidebarProps {
  open: boolean
  onClose: () => void
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const handleNavClick = () => {
    // Cerrar sidebar en móvil al navegar
    onClose()
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col',
        'transition-transform duration-200 ease-in-out',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo + botón cerrar en móvil */}
      <div className="h-14 lg:h-16 flex items-center justify-between px-5 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-gold text-brand-gold-foreground shrink-0">
            <Fingerprint className="w-3.5 h-3.5" strokeWidth={2.25} />
          </div>
          <span className="text-sidebar-foreground font-semibold text-sm tracking-wide">
            DetectiveOS
          </span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
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
                    <span className="flex-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-sidebar-border">
          <ul className="space-y-0.5">
            {secondaryItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                    )
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-0.5 shrink-0">
        <NavLink
          to={ROUTES.SETTINGS}
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
            )
          }
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </NavLink>

        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? ''}
              className="w-6 h-6 rounded-full shrink-0 ring-1 ring-sidebar-border"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-xs text-sidebar-accent-foreground shrink-0">
              {user?.displayName?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sidebar-foreground/80 truncate">
              {user?.displayName || user?.email || '—'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground/80 transition-colors shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
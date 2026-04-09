import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

interface RouteGuardProps {
  children: React.ReactNode
  allowedTypes?: Array<'superadmin' | 'firm_member' | 'portal_client'>
}

export function RouteGuard({ children, allowedTypes }: RouteGuardProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (user.userType === 'unknown') {
    return <Navigate to={ROUTES.ONBOARDING} replace />
  }

  if (allowedTypes && !allowedTypes.includes(user.userType as never)) {
    if (user.userType === 'superadmin') {
      return <Navigate to={ROUTES.SUPERADMIN} replace />
    }
    if (user.userType === 'portal_client') {
      return <Navigate to={ROUTES.PORTAL} replace />
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <>{children}</>
}
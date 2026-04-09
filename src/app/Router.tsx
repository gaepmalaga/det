import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { RouteGuard } from '@/components/shared/RouteGuard'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LeadsPage } from '@/features/leads/LeadsPage'
import { LeadDetailPage } from '@/features/leads/LeadDetailPage'
import { CasesPage } from '@/features/cases/CasesPage'
import { CaseDetailPage } from '@/features/cases/CaseDetailPage'

const Placeholder = ({ name }: { name: string }) => (
  <div className="text-slate-500 text-sm">{name} — en construcción</div>
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
        <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />

        <Route
          path="/app"
          element={
            <RouteGuard allowedTypes={['firm_member']}>
              <AppShell />
            </RouteGuard>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:leadId" element={<LeadDetailPage />} />
          <Route path="clients" element={<Placeholder name="Clientes" />} />
          <Route path="pre-cases" element={<Placeholder name="Pre-expedientes" />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:caseId" element={<CaseDetailPage />} />
          <Route path="registry-book" element={<Placeholder name="Libro-registro" />} />
          <Route path="contracts" element={<Placeholder name="Contratos" />} />
          <Route path="reports" element={<Placeholder name="Informes" />} />
          <Route path="compliance" element={<Placeholder name="Cumplimiento" />} />
          <Route path="collaborators" element={<Placeholder name="Colaboradores" />} />
          <Route path="team" element={<Placeholder name="Equipo" />} />
          <Route path="settings" element={<Placeholder name="Configuración" />} />
        </Route>

        <Route
          path="/portal"
          element={
            <RouteGuard allowedTypes={['portal_client']}>
              <Placeholder name="Portal cliente" />
            </RouteGuard>
          }
        />

        <Route
          path="/superadmin"
          element={
            <RouteGuard allowedTypes={['superadmin']}>
              <Placeholder name="Superadmin" />
            </RouteGuard>
          }
        />

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
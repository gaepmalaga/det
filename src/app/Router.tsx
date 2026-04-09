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
import { ClientsPage } from '@/features/clients/ClientsPage'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import { ContractsPage } from '@/features/contracts/ContractsPage'
import { RegistryBookPage } from '@/features/registry/RegistryBookPage'
import { CompliancePage } from '@/features/compliance/CompliancePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PortalLoginPage } from '@/features/portal/PortalLoginPage'
import { PortalLayout } from '@/features/portal/PortalLayout'
import { PortalDashboard } from '@/features/portal/PortalDashboard'
import { PortalCaseDetail } from '@/features/portal/PortalCaseDetail'

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
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="pre-cases" element={<Placeholder name="Pre-expedientes" />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:caseId" element={<CaseDetailPage />} />
          <Route path="registry-book" element={<RegistryBookPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="reports" element={<Placeholder name="Informes" />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="collaborators" element={<Placeholder name="Colaboradores" />} />
          <Route path="team" element={<Placeholder name="Equipo" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/portal" element={<PortalLoginPage />} />
        <Route
          path="/portal"
          element={
            <RouteGuard allowedTypes={['portal_client', 'firm_member', 'superadmin']}>
              <PortalLayout />
            </RouteGuard>
          }
        >
          <Route path="cases" element={<PortalDashboard />} />
          <Route path="cases/:caseId" element={<PortalCaseDetail />} />
        </Route>

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
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { RouteGuard } from '@/components/shared/RouteGuard'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { SignContractPage } from '@/features/sign/SignContractPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ContactDetailPage } from '@/features/contacts/ContactDetailPage'
import { CasesPage } from '@/features/cases/CasesPage'
import { CaseDetailPage } from '@/features/cases/CaseDetailPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import { ContractsPage } from '@/features/contracts/ContractsPage'
import { RegistryEntryPage } from '@/features/registry/RegistryEntryPage'
import { ArchivePage } from '@/features/registry/ArchivePage'
import { TodayPage } from '@/features/today/TodayPage'
import { OpportunitiesPage } from '@/features/opportunities/OpportunitiesPage'
import { CompliancePage } from '@/features/compliance/CompliancePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PortalLoginPage } from '@/features/portal/PortalLoginPage'
import { PortalLayout } from '@/features/portal/PortalLayout'
import { PortalDashboard } from '@/features/portal/PortalDashboard'
import { PortalCaseDetail } from '@/features/portal/PortalCaseDetail'

import { SuperadminLayout } from '@/features/superadmin/SuperadminLayout'
import { SuperadminDashboard } from '@/features/superadmin/SuperadminDashboard'
import { FirmsPage } from '@/features/superadmin/FirmsPage'
import { FirmDetailPage } from '@/features/superadmin/FirmDetailPage'

import { ReportsPage } from '@/features/reports/ReportsPage'
import { StatsPage } from '@/features/stats/StatsPage'

import { CollaboratorsPage } from '@/features/collaborators/CollaboratorsPage'
import { CollaboratorDetailPage } from '@/features/collaborators/CollaboratorDetailPage'
import { CollaborateInvitePage } from '@/features/collaborators/CollaborateInvitePage'
import { CollaboratePortalLayout } from '@/features/collaborate/CollaboratePortalLayout'
import { CollaborateDashboard } from '@/features/collaborate/CollaborateDashboard'
import { CollaborateCaseDetail } from '@/features/collaborate/CollaborateCaseDetail'

const Placeholder = ({ name }: { name: string }) => (
  <div className="text-muted-foreground text-sm">{name} — en construcción</div>
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
        <Route path={ROUTES.SIGN_CONTRACT} element={<SignContractPage />} />
        <Route path={ROUTES.COLLABORATOR_INVITE} element={<CollaborateInvitePage />} />
        {/* La raíz deja de ser una redirección al login: es la página
            pública desde la que se entra a probar la plataforma. */}
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/app"
          element={
            <RouteGuard allowedTypes={['firm_member']}>
              <AppShell />
            </RouteGuard>
          }
        >
          <Route index element={<Navigate to={ROUTES.TODAY} replace />} />
          <Route path="today" element={<TodayPage />} />
          {/* Archivo y Libro-registro eran la misma pantalla con dos
              nombres. Se queda el nombre legal, que es el que usa el
              despacho y por el que pregunta una inspección. */}
          <Route path="archive" element={<Navigate to={ROUTES.REGISTRY_BOOK} replace />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="contacts/:contactId" element={<ContactDetailPage />} />

          {/* Contactos y Presupuestos eran dos pantallas de lo mismo:
              ahora son Oportunidades. Se mantienen como redirección para
              que no se rompa un enlace guardado ni el historial de nadie. */}
          <Route path="contacts" element={<Navigate to={ROUTES.OPPORTUNITIES} replace />} />
          <Route path="quotes" element={<Navigate to={ROUTES.OPPORTUNITIES} replace />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:caseId" element={<CaseDetailPage />} />
          <Route path="registry-book" element={<ArchivePage />} />
          <Route path="registry-book/:entryId" element={<RegistryEntryPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="collaborators" element={<CollaboratorsPage />} />
<Route path="collaborators/:collaboratorId" element={<CollaboratorDetailPage />} />
          <Route path="team" element={<Placeholder name="Equipo" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/collaborate"
          element={
            <RouteGuard allowedTypes={['collaborator']}>
              <CollaboratePortalLayout />
            </RouteGuard>
          }
        >
          <Route index element={<CollaborateDashboard />} />
          <Route path="cases/:caseId" element={<CollaborateCaseDetail />} />
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
      <SuperadminLayout />
    </RouteGuard>
  }
>
  <Route index element={<SuperadminDashboard />} />
  <Route path="firms" element={<FirmsPage />} />
  <Route path="firms/:firmId" element={<FirmDetailPage />} />
  <Route path="plans" element={<Placeholder name="Planes y billing" />} />
  <Route path="audit" element={<Placeholder name="Auditoría global" />} />
</Route>

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
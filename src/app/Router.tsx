import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { RouteGuard } from '@/components/shared/RouteGuard'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { SignContractPage } from '@/features/sign/SignContractPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { ContactDetailPage } from '@/features/contacts/ContactDetailPage'
import { QuotesPage } from '@/features/quotes/QuotesPage'
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

import { SuperadminLayout } from '@/features/superadmin/SuperadminLayout'
import { SuperadminDashboard } from '@/features/superadmin/SuperadminDashboard'
import { FirmsPage } from '@/features/superadmin/FirmsPage'
import { FirmDetailPage } from '@/features/superadmin/FirmDetailPage'

import { ReportsPage } from '@/features/reports/ReportsPage'

import { CollaboratorsPage } from '@/features/collaborators/CollaboratorsPage'
import { CollaboratorDetailPage } from '@/features/collaborators/CollaboratorDetailPage'

const Placeholder = ({ name }: { name: string }) => (
  <div className="text-slate-500 text-sm">{name} — en construcción</div>
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
        <Route path={ROUTES.SIGN_CONTRACT} element={<SignContractPage />} />
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
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="contacts/:contactId" element={<ContactDetailPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:caseId" element={<CaseDetailPage />} />
          <Route path="registry-book" element={<RegistryBookPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="collaborators" element={<CollaboratorsPage />} />
<Route path="collaborators/:collaboratorId" element={<CollaboratorDetailPage />} />
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
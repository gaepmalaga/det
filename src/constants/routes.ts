export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  PRICING: '/pricing',

  // Onboarding
  ONBOARDING: '/onboarding',

  // App — Despacho
  DASHBOARD: '/app/dashboard',
  CONTACTS: '/app/contacts',
  CONTACT_DETAIL: '/app/contacts/:contactId',
  QUOTES: '/app/quotes',
  CLIENTS: '/app/clients',
  CLIENT_DETAIL: '/app/clients/:clientId',
  CASES: '/app/cases',
  CASE_DETAIL: '/app/cases/:caseId',
  CASE_ACTIONS: '/app/cases/:caseId/actions',
  CASE_REPORT: '/app/cases/:caseId/report',
  CASE_AUDIT: '/app/cases/:caseId/audit',
  REGISTRY_BOOK: '/app/registry-book',
  CONTRACTS: '/app/contracts',
  CONTRACT_DETAIL: '/app/contracts/:contractId',
  FRAMEWORK_CONTRACTS: '/app/framework-contracts',
  REPORTS: '/app/reports',
  COMPLIANCE: '/app/compliance',
  COLLABORATORS: '/app/collaborators',
  TEAM: '/app/team',
  SETTINGS: '/app/settings',

  // Portal cliente
  PORTAL: '/portal',
  PORTAL_CASES: '/portal/cases',
  PORTAL_CASE_DETAIL: '/portal/cases/:caseId',
  PORTAL_DOCUMENTS: '/portal/documents',
  PORTAL_MESSAGES: '/portal/messages',

  // Superadmin
  SUPERADMIN: '/superadmin',
  SUPERADMIN_FIRMS: '/superadmin/firms',
  SUPERADMIN_FIRM_DETAIL: '/superadmin/firms/:firmId',
  SUPERADMIN_PLANS: '/superadmin/plans',
  SUPERADMIN_BILLING: '/superadmin/billing',
  SUPERADMIN_SUPPORT: '/superadmin/support',
  SUPERADMIN_AUDIT: '/superadmin/audit',
} as const
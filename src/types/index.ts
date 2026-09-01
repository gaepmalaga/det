// ─── ROLES ───────────────────────────────────────────────────────────────────

export type FirmMemberRole =
  | 'firm_owner'
  | 'firm_director'
  | 'detective_senior'
  | 'detective_junior'
  | 'admin_staff'
  | 'compliance_officer'

export type PlatformRole = 'superadmin'
export type ClientRole = 'individual_client' | 'corporate_client'

// ─── PLATFORM ADMIN ──────────────────────────────────────────────────────────

export interface PlatformAdmin {
  userId: string
  email: string
  role: PlatformRole
  createdAt: Date
}

// ─── FIRM ────────────────────────────────────────────────────────────────────

export type LegalType = 'individual' | 'company'
export type FirmStatus = 'active' | 'suspended' | 'cancelled' | 'trial'

export interface FirmAddress {
  street: string
  city: string
  province: string
  postalCode: string
  country: string
}

export interface LegalRepresentative {
  name: string
  taxId: string
  role: string
}

export interface Firm {
  id: string
  legalType: LegalType
  legalName: string
  tradeName?: string
  taxId: string
  rnsp: string
  registeredAddress: FirmAddress
  legalRepresentative?: LegalRepresentative
  titular: {
    memberId: string
    tipNumber: string
    tipExpiry?: Date
  }
  customInvestigationTypes: string[]
  contractTemplate?: ContractTemplate
  status: FirmStatus
  planId: string
  createdAt: Date
  updatedAt: Date
}

export interface ContractTemplate {
  name: string
  body: string
}

// ─── MEMBER ──────────────────────────────────────────────────────────────────

export type TipStatus = 'active' | 'suspended' | 'expired'
export type DependencyType = 'owner' | 'dependent' | null

export interface MemberPreferences {
  autoAssignAsDetective: boolean
}

export interface Member {
  id: string
  firmId: string
  userId: string
  email: string
  displayName: string
  photoURL?: string
  role: FirmMemberRole
  tipNumber?: string
  tipExpiry?: Date
  tipStatus?: TipStatus
  dependencyType: DependencyType
  preferences: MemberPreferences
  isActive: boolean
  // Miembro invitado por email (TeamTab → addMember) cuya cuenta futura aún
  // no se ha vinculado — ver memberInvites/{email} y claimMemberInvite en
  // services/firm.ts. Ausente en miembros ya vinculados al crearse (p. ej.
  // el titular en OnboardingPage).
  invitationStatus?: 'pendiente' | 'aceptada'
  createdAt: Date
  updatedAt: Date
}

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────

export type AppUserType = 'superadmin' | 'firm_member' | 'portal_client' | 'collaborator' | 'unknown'

export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  userType: AppUserType
  firmId?: string
  memberRole?: FirmMemberRole
  firmStatus?: FirmStatus
}

// ─── INVESTIGATION TYPES ──────────────────────────────────────────────────────

export const SYSTEM_INVESTIGATION_TYPES = [
  'Vigilancia y seguimiento',
  'Investigación de infidelidad',
  'Localización de personas',
  'Investigación laboral',
  'Investigación mercantil y financiera',
  'Investigación de fraude',
  'Localización de bienes',
  'Otros',
] as const

export type SystemInvestigationType = typeof SYSTEM_INVESTIGATION_TYPES[number]

// ─── CONTACT ─────────────────────────────────────────────────────────────────

export type ContactType = 'individual' | 'corporate'

export interface Contact {
  id: string
  firmId: string
  referenceNumber: string
  createdAt: Date
  updatedAt: Date

  contactName: string
  contactEmail: string
  contactPhone: string
  contactType: ContactType
  companyName?: string

  assignedTo?: string
  notes?: string

  // Trazabilidad
  createdBy: string
}

// ─── QUOTE (presupuesto) ───────────────────────────────────────────────────────

export type QuoteStatus = 'enviado' | 'aceptado' | 'rechazado'

export interface Quote {
  id: string
  firmId: string
  contactId: string
  quoteNumber: string
  createdAt: Date
  updatedAt: Date

  // Encargo
  investigationType: string
  investigationTypeCustom?: string
  description: string
  amount: number

  // Gestión
  status: QuoteStatus
  rejectionReason?: string
  clientId?: string
  contractId?: string
  caseId?: string

  // PDF del presupuesto, subido opcionalmente si se generó fuera de la
  // plataforma (p. ej. con otra herramienta de facturación).
  documentUrl?: string
  documentName?: string

  // Datos legales del expediente, capturados al aceptar el presupuesto
  // (antes de que exista el expediente — ver §3 del documento de
  // producto: el orden real es presupuesto → contrato → expediente).
  // Se usan para abrir el expediente en cuanto el contrato queda firmado.
  objectScope?: string
  legitimateInterest?: string
  investigatedName?: string
  investigatedAddress?: string
  assignedDetectiveId?: string
  assignedDetectiveTip?: string

  // Trazabilidad
  createdBy: string
}

// ─── CASE ────────────────────────────────────────────────────────────────────

export type CaseStatus =
  | 'revision'
  | 'presupuesto'
  | 'contrato_pendiente'
  | 'activo'
  | 'suspendido'
  | 'trabajo_terminado'
  | 'cerrado'
  | 'archivado'
  | 'rechazado'

export type ComplianceStatus = 'green' | 'amber' | 'red'

export interface StatusHistoryEntry {
  status: CaseStatus
  changedAt: Date
  changedBy: string
  reason?: string
}

export interface Case {
  id: string
  firmId: string
  caseNumber: string
  caseNumberInt: number
  createdAt: Date
  updatedAt: Date

  // Origen
  quoteId?: string
  clientId?: string
  branchId?: string

  // Económico — también se rellena cuando el origen es un contrato marco
  // (billingMode: 'framework'), que no pasa por quotes (ver §4.6/§7 del
  // documento de producto).
  agreedAmount?: number
  billingMode: 'quote' | 'framework'

  // Estado
  status: CaseStatus
  statusHistory: StatusHistoryEntry[]

  // Encargo
  investigationType: string
  investigationTypeCustom?: string
  description: string
  objectScope: string
  legitimateInterest: string
  legitimateInterestValidated: boolean

  // Investigado (obligatorio para el libro-registro, Anexo VII)
  investigatedName: string
  investigatedAddress: string

  // Asignación
  assignedDetectiveId: string
  assignedDetectiveTip: string
  collaboratingFirmId?: string

  // Presupuesto
  budgetId?: string
  budgetApprovedAt?: Date
  budgetRejectedAt?: Date

  // Contrato
  contractId?: string
  contractSignedAt?: Date
  contractSignedByClientUid?: string
  contractSignedIp?: string

  // Informe
  reportId?: string
  reportSentAt?: Date

  // Cierre
  closedAt?: Date
  closedBy?: string

  // Conservación
  conservationDeadline?: Date
  destructionRequestedAt?: Date
  destructionCompletedAt?: Date
  hasActiveException: boolean

  // Libro-registro
  registryEntryId?: string
  registryEntryNumber?: number

  // Cumplimiento
  complianceStatus: ComplianceStatus
  complianceIssues: string[]

  // Trazabilidad
  createdBy: string
}

// ─── SUBJECT ─────────────────────────────────────────────────────────────────

export type DocumentType = 'dni' | 'nie' | 'passport' | 'other'

export interface Subject {
  id: string
  caseId: string
  name: string
  documentType?: DocumentType
  documentNumber?: string
  description?: string
  createdAt: Date
  createdBy: string
}

// ─── ACTION (actuación — captura rápida) ──────────────────────────────────────

export interface CaseAction {
  id: string
  caseId: string
  description: string
  locationLat?: number
  locationLng?: number
  detectiveId: string
  detectiveTip: string
  createdAt: Date
  createdBy: string
  // Colaborador sin plataforma cuyo avance por email/teléfono queda
  // registrado aquí en su nombre (Fase 5, §4.5).
  reportedByCollaboratorId?: string
}

// ─── CLIENT ──────────────────────────────────────────────────────────────────

export type CorporateType = 'insurance' | 'mutual' | 'large_account' | 'law_firm' | 'other'

export interface ClientAddress {
  street: string
  city: string
  province: string
  postalCode: string
}

export interface Client {
  id: string
  firmId: string
  clientType: ContactType
  corporateType?: CorporateType
  legalName: string
  tradeName?: string
  taxId: string
  email: string
  phone: string
  address?: ClientAddress
  frameworkContractId?: string
  portalAccessEnabled: boolean
  portalUserId?: string
  convertedFromContactId?: string
  isActive: boolean
  createdAt: Date
  createdBy: string
  updatedAt: Date
}

// ─── FRAMEWORK CONTRACT (contrato marco — cliente habitual) ──────────────────
// Documento externo (redactado por el propio cliente/sus abogados), subido
// tal cual — a diferencia de `ContractTemplate`/`Contract`, no se genera
// desde una plantilla. Mientras esté activo, los expedientes de este cliente
// se abren directamente sin pasar por `quotes`.

export type FrameworkContractStatus = 'activo' | 'inactivo'

export interface FrameworkContract {
  id: string
  firmId: string
  clientId: string
  fileName: string
  fileUrl: string
  notes?: string
  status: FrameworkContractStatus
  createdAt: Date
  createdBy: string
}

// ─── REGISTRY BOOK ───────────────────────────────────────────────────────────

export type RegistryEntryStatus = 'abierto' | 'cerrado'

export interface RegistryAmendment {
  amendedAt: Date
  amendedBy: string
  field: string
  oldValue: string
  newValue: string
  reason: string
}

export interface RegistryEntry {
  id: string
  firmId: string
  entryNumber: number
  entryDate: Date
  firmRnsp: string
  branchId?: string
  clientName: string
  clientTaxId: string
  clientType: ContactType
  investigationObject: string
  investigatedName: string
  investigatedAddress: string
  knownOffenses: string
  offensesReportedTo: string
  detectiveName: string
  detectiveTip: string
  startDate: Date
  endDate?: Date
  caseId: string
  caseNumber: string
  reportId?: string
  status: RegistryEntryStatus
  amendments: RegistryAmendment[]
  createdAt: Date
  createdBy: string
}
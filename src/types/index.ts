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
  status: FirmStatus
  planId: string
  createdAt: Date
  updatedAt: Date
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
  createdAt: Date
  updatedAt: Date
}

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────

export type AppUserType = 'superadmin' | 'firm_member' | 'portal_client' | 'unknown'

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

// ─── LEAD ────────────────────────────────────────────────────────────────────

export type LeadStatus = 'nuevo' | 'en_revision' | 'aceptado' | 'rechazado'
export type ContactType = 'individual' | 'corporate'

export interface Lead {
  id: string
  firmId: string
  referenceNumber: string
  createdAt: Date
  updatedAt: Date

  // Contacto
  contactName: string
  contactEmail: string
  contactPhone: string
  contactType: ContactType
  companyName?: string

  // Encargo
  investigationType: string
  investigationTypeCustom?: string
  description: string

  // Gestión
  status: LeadStatus
  assignedTo?: string
  rejectionReason?: string
  notes?: string

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
  leadId?: string
  clientId?: string
  branchId?: string

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

// ─── ACTION ──────────────────────────────────────────────────────────────────

export type RateType = 'diurna' | 'nocturna' | 'festivo' | 'finde'

export interface CaseAction {
  id: string
  caseId: string
  date: Date
  startTime: string
  endTime: string
  hoursWorked: number
  rateType: RateType
  location: string
  description: string
  detectiveId: string
  detectiveTip: string
  evidenceIds: string[]
  createdAt: Date
  createdBy: string
}

// ─── EVIDENCE ────────────────────────────────────────────────────────────────

export type EvidenceType = 'photo' | 'video' | 'audio' | 'document' | 'geolocation' | 'other'
export type EvidenceVisibility = 'internal' | 'client'

export interface Evidence {
  id: string
  caseId: string
  type: EvidenceType
  description: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  hash?: string
  obtainedAt: Date
  actionId?: string
  detectiveId: string
  detectiveTip: string
  visibility: EvidenceVisibility
  conservationDeadline?: Date
  hasActiveException: boolean
  createdAt: Date
  createdBy: string
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
  convertedFromLeadId?: string
  isActive: boolean
  createdAt: Date
  createdBy: string
  updatedAt: Date
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
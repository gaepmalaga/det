import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Case, CaseStatus, ComplianceStatus } from '@/types'

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function toDateOrUndefined(val: unknown): Date | undefined {
  if (!val) return undefined
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return undefined
}

function mapCase(id: string, data: Record<string, unknown>): Case {
  const statusHistory = Array.isArray(data.statusHistory)
    ? (data.statusHistory as Record<string, unknown>[]).map((entry) => ({
        status: entry.status as CaseStatus,
        changedAt: toDate(entry.changedAt),
        changedBy: entry.changedBy as string,
        reason: entry.reason as string | undefined,
      }))
    : []

  return {
    id,
    firmId: data.firmId as string,
    caseNumber: data.caseNumber as string,
    caseNumberInt: data.caseNumberInt as number,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    leadId: data.leadId as string | undefined,
    clientId: data.clientId as string | undefined,
    branchId: data.branchId as string | undefined,
    status: data.status as CaseStatus,
    statusHistory,
    investigationType: data.investigationType as string,
    investigationTypeCustom: data.investigationTypeCustom as string | undefined,
    description: data.description as string,
    objectScope: data.objectScope as string,
    legitimateInterest: data.legitimateInterest as string,
    legitimateInterestValidated: data.legitimateInterestValidated as boolean ?? false,
    assignedDetectiveId: data.assignedDetectiveId as string,
    assignedDetectiveTip: data.assignedDetectiveTip as string,
    collaboratingFirmId: data.collaboratingFirmId as string | undefined,
    budgetId: data.budgetId as string | undefined,
    budgetApprovedAt: toDateOrUndefined(data.budgetApprovedAt),
    budgetRejectedAt: toDateOrUndefined(data.budgetRejectedAt),
    contractId: data.contractId as string | undefined,
    contractSignedAt: toDateOrUndefined(data.contractSignedAt),
    contractSignedByClientUid: data.contractSignedByClientUid as string | undefined,
    contractSignedIp: data.contractSignedIp as string | undefined,
    reportId: data.reportId as string | undefined,
    reportSentAt: toDateOrUndefined(data.reportSentAt),
    closedAt: toDateOrUndefined(data.closedAt),
    closedBy: data.closedBy as string | undefined,
    conservationDeadline: toDateOrUndefined(data.conservationDeadline),
    destructionRequestedAt: toDateOrUndefined(data.destructionRequestedAt),
    destructionCompletedAt: toDateOrUndefined(data.destructionCompletedAt),
    hasActiveException: data.hasActiveException as boolean ?? false,
    registryEntryId: data.registryEntryId as string | undefined,
    registryEntryNumber: data.registryEntryNumber as number | undefined,
    complianceStatus: (data.complianceStatus as ComplianceStatus) ?? 'amber',
    complianceIssues: (data.complianceIssues as string[]) ?? [],
    createdBy: data.createdBy as string,
  }
}

export async function getCases(firmId: string): Promise<Case[]> {
  const ref = collection(db, 'firms', firmId, 'cases')
  const q = query(ref, orderBy('caseNumberInt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapCase(d.id, d.data() as Record<string, unknown>))
}

export async function getCasesByStatus(firmId: string, status: CaseStatus): Promise<Case[]> {
  const ref = collection(db, 'firms', firmId, 'cases')
  const q = query(ref, where('status', '==', status), orderBy('caseNumberInt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapCase(d.id, d.data() as Record<string, unknown>))
}

export async function getCase(firmId: string, caseId: string): Promise<Case | null> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapCase(snap.id, snap.data() as Record<string, unknown>)
}

export interface CreateCaseData {
  investigationType: string
  investigationTypeCustom?: string
  description: string
  objectScope: string
  legitimateInterest: string
  assignedDetectiveId: string
  assignedDetectiveTip: string
  leadId?: string
  clientId?: string
  branchId?: string
}

export async function createCase(
  firmId: string,
  userId: string,
  data: CreateCaseData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'cases')

  const countSnap = await getDocs(ref)
  const count = countSnap.size + 1
  const caseNumber = `EXP-${String(count).padStart(4, '0')}`

  const now = new Date()
  const conservationDeadline = new Date(now)
  conservationDeadline.setFullYear(conservationDeadline.getFullYear() + 3)

  const initialStatusEntry = {
    status: 'revision' as CaseStatus,
    changedAt: serverTimestamp(),
    changedBy: userId,
  }

  const docRef = await addDoc(ref, {
    firmId,
    caseNumber,
    caseNumberInt: count,
    ...data,
    status: 'revision' as CaseStatus,
    statusHistory: [initialStatusEntry],
    legitimateInterestValidated: false,
    hasActiveException: false,
    complianceStatus: 'amber' as ComplianceStatus,
    complianceIssues: ['Interés legítimo pendiente de validar'],
    conservationDeadline: Timestamp.fromDate(conservationDeadline),
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function updateCaseStatus(
  firmId: string,
  caseId: string,
  newStatus: CaseStatus,
  userId: string,
  reason?: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId)

  const statusEntry = {
    status: newStatus,
    changedAt: Timestamp.now(),
    changedBy: userId,
    ...(reason ? { reason } : {}),
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    statusHistory: arrayUnion(statusEntry),
    updatedAt: serverTimestamp(),
  }

  if (newStatus === 'cerrado') {
    updateData.closedAt = serverTimestamp()
    updateData.closedBy = userId
  }

  await updateDoc(ref, updateData)
}

export async function updateCase(
  firmId: string,
  caseId: string,
  data: Partial<CreateCaseData>
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId)
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
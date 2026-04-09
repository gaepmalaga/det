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
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Lead, LeadStatus } from '@/types'

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function mapLead(id: string, data: Record<string, unknown>): Lead {
  return {
    id,
    firmId: data.firmId as string,
    referenceNumber: data.referenceNumber as string,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    contactName: data.contactName as string,
    contactEmail: data.contactEmail as string,
    contactPhone: data.contactPhone as string,
    contactType: data.contactType as Lead['contactType'],
    companyName: data.companyName as string | undefined,
    investigationType: data.investigationType as string,
    investigationTypeCustom: data.investigationTypeCustom as string | undefined,
    description: data.description as string,
    status: data.status as LeadStatus,
    assignedTo: data.assignedTo as string | undefined,
    rejectionReason: data.rejectionReason as string | undefined,
    notes: data.notes as string | undefined,
    createdBy: data.createdBy as string,
  }
}

export async function getLeads(firmId: string): Promise<Lead[]> {
  const ref = collection(db, 'firms', firmId, 'leads')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapLead(d.id, d.data() as Record<string, unknown>))
}

export async function getLead(firmId: string, leadId: string): Promise<Lead | null> {
  const ref = doc(db, 'firms', firmId, 'leads', leadId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapLead(snap.id, snap.data() as Record<string, unknown>)
}

export async function getLeadsByStatus(firmId: string, status: LeadStatus): Promise<Lead[]> {
  const ref = collection(db, 'firms', firmId, 'leads')
  const q = query(ref, where('status', '==', status), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapLead(d.id, d.data() as Record<string, unknown>))
}

export interface CreateLeadData {
  contactName: string
  contactEmail: string
  contactPhone: string
  contactType: Lead['contactType']
  companyName?: string
  investigationType: string
  investigationTypeCustom?: string
  description: string
  assignedTo?: string
  notes?: string
}

export async function createLead(
  firmId: string,
  userId: string,
  data: CreateLeadData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'leads')

  const countSnap = await getDocs(ref)
  const count = countSnap.size + 1
  const referenceNumber = `LEAD-${String(count).padStart(4, '0')}`

  // Firestore no acepta undefined — construimos el objeto limpio
  const cleanData: Record<string, unknown> = {
    firmId,
    referenceNumber,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    contactType: data.contactType,
    investigationType: data.investigationType,
    description: data.description,
    status: 'nuevo' as LeadStatus,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.companyName) cleanData.companyName = data.companyName
  if (data.investigationTypeCustom) cleanData.investigationTypeCustom = data.investigationTypeCustom
  if (data.notes) cleanData.notes = data.notes
  if (data.assignedTo) cleanData.assignedTo = data.assignedTo

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function updateLeadStatus(
  firmId: string,
  leadId: string,
  status: LeadStatus,
  extra?: { rejectionReason?: string; notes?: string }
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'leads', leadId)

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  }

  if (extra?.rejectionReason) updateData.rejectionReason = extra.rejectionReason
  if (extra?.notes) updateData.notes = extra.notes

  await updateDoc(ref, updateData)
}

export async function updateLead(
  firmId: string,
  leadId: string,
  data: Partial<CreateLeadData>
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'leads', leadId)

  const cleanData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.contactName !== undefined) cleanData.contactName = data.contactName
  if (data.contactEmail !== undefined) cleanData.contactEmail = data.contactEmail
  if (data.contactPhone !== undefined) cleanData.contactPhone = data.contactPhone
  if (data.contactType !== undefined) cleanData.contactType = data.contactType
  if (data.companyName) cleanData.companyName = data.companyName
  if (data.investigationType !== undefined) cleanData.investigationType = data.investigationType
  if (data.investigationTypeCustom) cleanData.investigationTypeCustom = data.investigationTypeCustom
  if (data.description !== undefined) cleanData.description = data.description
  if (data.notes) cleanData.notes = data.notes
  if (data.assignedTo) cleanData.assignedTo = data.assignedTo

  await updateDoc(ref, cleanData)
}
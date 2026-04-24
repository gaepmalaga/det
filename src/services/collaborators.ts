import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type CollaboratorStatus = 'activo' | 'inactivo'

export interface Collaborator {
  id: string
  firmId: string
  legalName: string
  tradeName?: string
  rnsp: string
  taxId?: string
  contactName: string
  contactEmail: string
  contactPhone: string
  tipNumber?: string
  address?: string
  notes?: string
  status: CollaboratorStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface CreateCollaboratorData {
  legalName: string
  tradeName?: string
  rnsp: string
  taxId?: string
  contactName: string
  contactEmail: string
  contactPhone: string
  tipNumber?: string
  address?: string
  notes?: string
}

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function mapCollaborator(id: string, data: Record<string, unknown>): Collaborator {
  return {
    id,
    firmId: data.firmId as string,
    legalName: data.legalName as string,
    tradeName: data.tradeName as string | undefined,
    rnsp: data.rnsp as string,
    taxId: data.taxId as string | undefined,
    contactName: data.contactName as string,
    contactEmail: data.contactEmail as string,
    contactPhone: data.contactPhone as string,
    tipNumber: data.tipNumber as string | undefined,
    address: data.address as string | undefined,
    notes: data.notes as string | undefined,
    status: (data.status as CollaboratorStatus) ?? 'activo',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: data.createdBy as string,
  }
}

export async function getCollaborators(firmId: string): Promise<Collaborator[]> {
  const ref = collection(db, 'firms', firmId, 'collaboratingFirms')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapCollaborator(d.id, d.data() as Record<string, unknown>))
}

export async function getCollaborator(
  firmId: string,
  collaboratorId: string
): Promise<Collaborator | null> {
  const ref = doc(db, 'firms', firmId, 'collaboratingFirms', collaboratorId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapCollaborator(snap.id, snap.data() as Record<string, unknown>)
}

export async function createCollaborator(
  firmId: string,
  userId: string,
  data: CreateCollaboratorData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'collaboratingFirms')
  const cleanData: Record<string, unknown> = {
    firmId,
    legalName: data.legalName,
    rnsp: data.rnsp.toUpperCase(),
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    status: 'activo' as CollaboratorStatus,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (data.tradeName) cleanData.tradeName = data.tradeName
  if (data.taxId) cleanData.taxId = data.taxId.toUpperCase()
  if (data.tipNumber) cleanData.tipNumber = data.tipNumber.toUpperCase()
  if (data.address) cleanData.address = data.address
  if (data.notes) cleanData.notes = data.notes

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function updateCollaborator(
  firmId: string,
  collaboratorId: string,
  data: Partial<CreateCollaboratorData> & { status?: CollaboratorStatus }
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'collaboratingFirms', collaboratorId)
  const cleanData: Record<string, unknown> = { updatedAt: serverTimestamp() }

  if (data.legalName !== undefined) cleanData.legalName = data.legalName
  if (data.tradeName !== undefined) cleanData.tradeName = data.tradeName
  if (data.rnsp !== undefined) cleanData.rnsp = data.rnsp.toUpperCase()
  if (data.taxId !== undefined) cleanData.taxId = data.taxId.toUpperCase()
  if (data.contactName !== undefined) cleanData.contactName = data.contactName
  if (data.contactEmail !== undefined) cleanData.contactEmail = data.contactEmail
  if (data.contactPhone !== undefined) cleanData.contactPhone = data.contactPhone
  if (data.tipNumber !== undefined) cleanData.tipNumber = data.tipNumber.toUpperCase()
  if (data.address !== undefined) cleanData.address = data.address
  if (data.notes !== undefined) cleanData.notes = data.notes
  if (data.status !== undefined) cleanData.status = data.status

  await updateDoc(ref, cleanData)
}
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface PortalAccess {
  id: string
  firmId: string
  caseId: string
  caseNumber: string
  clientEmail: string
  clientName: string
  clientUserId?: string
  isActive: boolean
  createdAt: Date
  createdBy: string
  lastAccessAt?: Date
}

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

function mapAccess(id: string, data: Record<string, unknown>): PortalAccess {
  return {
    id,
    firmId: data.firmId as string,
    caseId: data.caseId as string,
    caseNumber: data.caseNumber as string,
    clientEmail: data.clientEmail as string,
    clientName: data.clientName as string,
    clientUserId: data.clientUserId as string | undefined,
    isActive: data.isActive as boolean ?? true,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
    lastAccessAt: toDateOrUndefined(data.lastAccessAt),
  }
}

// ─── ACCESOS ─────────────────────────────────────────────────────────────────

export async function getCasePortalAccess(
  firmId: string,
  caseId: string
): Promise<PortalAccess[]> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'portalAccess')
  const snap = await getDocs(ref)
  return snap.docs.map((d) => mapAccess(d.id, d.data() as Record<string, unknown>))
}

export async function createPortalAccess(
  firmId: string,
  caseId: string,
  caseNumber: string,
  userId: string,
  clientEmail: string,
  clientName: string
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'portalAccess')

  const docRef = await addDoc(ref, {
    firmId,
    caseId,
    caseNumber,
    clientEmail: clientEmail.toLowerCase().trim(),
    clientName: clientName.trim(),
    isActive: true,
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  // Registrar en portalClients para resolución de auth
  const portalRef = collection(db, 'portalClients')
  const existing = await getDocs(
    query(portalRef, where('email', '==', clientEmail.toLowerCase().trim()))
  )

  if (existing.empty) {
    await addDoc(portalRef, {
      email: clientEmail.toLowerCase().trim(),
      clientName: clientName.trim(),
      firmIds: [firmId],
      caseIds: [caseId],
      createdAt: serverTimestamp(),
    })
  } else {
    const existingDoc = existing.docs[0]
    const existingData = existingDoc.data()
    const firmIds = (existingData.firmIds as string[]) ?? []
    const caseIds = (existingData.caseIds as string[]) ?? []
    if (!firmIds.includes(firmId)) firmIds.push(firmId)
    if (!caseIds.includes(caseId)) caseIds.push(caseId)
    await updateDoc(existingDoc.ref, { firmIds, caseIds })
  }

  return docRef.id
}

export async function revokePortalAccess(
  firmId: string,
  caseId: string,
  accessId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'portalAccess', accessId)
  await updateDoc(ref, { isActive: false })
}

// ─── ACCESO CLIENTE ───────────────────────────────────────────────────────────

export async function getClientPortalData(email: string): Promise<{
  firmIds: string[]
  caseIds: string[]
} | null> {
  const ref = collection(db, 'portalClients')
  const q = query(ref, where('email', '==', email.toLowerCase().trim()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const data = snap.docs[0].data()
  return {
    firmIds: (data.firmIds as string[]) ?? [],
    caseIds: (data.caseIds as string[]) ?? [],
  }
}

export async function updatePortalClientUserId(
  email: string,
  userId: string
): Promise<void> {
  const ref = collection(db, 'portalClients')
  const q = query(ref, where('email', '==', email.toLowerCase().trim()))
  const snap = await getDocs(q)
  if (snap.empty) return
  await updateDoc(snap.docs[0].ref, { userId, lastAccessAt: serverTimestamp() })
}

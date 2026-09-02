import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type CollaboratorStatus = 'activo' | 'inactivo'
export type CollaboratorInvitationStatus = 'pendiente' | 'aceptada'

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

  // Modelo híbrido (Fase 5, §4.5): colaborador con cuenta propia en la
  // plataforma (acceso restringido a los casos donde colabora) vs.
  // colaborador solo dado de alta manualmente, sin cuenta.
  tienePlataforma: boolean
  invitedEmail?: string
  invitationStatus?: CollaboratorInvitationStatus
  linkedUserId?: string
  linkedUserEmail?: string
  // Nombre del despacho que invita, copiado en el momento de invitar —
  // así la página pública de invitación no necesita permiso para leer
  // `firms/{firmId}` (a la que un colaborador sin cuenta aún no pertenece).
  inviterFirmName?: string
  // Un colaborador dependiente trabaja bajo la estructura del propio
  // despacho (como un detective más, aunque no conste en `members`) y no
  // necesita un contrato de colaboración aparte — a diferencia de un
  // despacho o profesional independiente subcontratado, que sí lo
  // necesita (Ley 5/2014).
  esDependiente: boolean
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
  tienePlataforma?: boolean
  invitedEmail?: string
  inviterFirmName?: string
  esDependiente?: boolean
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
    tienePlataforma: (data.tienePlataforma as boolean) ?? false,
    invitedEmail: data.invitedEmail as string | undefined,
    invitationStatus: data.invitationStatus as CollaboratorInvitationStatus | undefined,
    linkedUserId: data.linkedUserId as string | undefined,
    linkedUserEmail: data.linkedUserEmail as string | undefined,
    inviterFirmName: data.inviterFirmName as string | undefined,
    esDependiente: (data.esDependiente as boolean) ?? false,
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

  if (data.tienePlataforma && data.invitedEmail) {
    cleanData.tienePlataforma = true
    cleanData.invitedEmail = data.invitedEmail.toLowerCase().trim()
    cleanData.invitationStatus = 'pendiente' as CollaboratorInvitationStatus
    if (data.inviterFirmName) cleanData.inviterFirmName = data.inviterFirmName
  } else {
    cleanData.tienePlataforma = false
  }
  cleanData.esDependiente = data.esDependiente ?? false

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

// ─── INVITACIÓN (colaborador con plataforma) ──────────────────────────────────
// Sin Cloud Functions no se puede enviar el email de invitación por sí solo
// — el despacho titular copia el enlace y lo envía por su cuenta (mismo
// modelo de "confianza en el enlace" que la firma pública de contratos).

export async function acceptCollaboratorInvitation(
  firmId: string,
  collaboratorId: string,
  uid: string,
  email: string
): Promise<void> {
  const collabRef = doc(db, 'firms', firmId, 'collaboratingFirms', collaboratorId)
  const snap = await getDoc(collabRef)
  if (!snap.exists()) throw new Error('Invitación no encontrada.')
  const data = snap.data()

  await updateDoc(collabRef, {
    invitationStatus: 'aceptada' as CollaboratorInvitationStatus,
    linkedUserId: uid,
    linkedUserEmail: email.toLowerCase().trim(),
  })

  const indexRef = doc(db, 'collaboratorIndex', uid)
  await setDoc(
    indexRef,
    {
      email: email.toLowerCase().trim(),
      collaborations: arrayUnion({
        firmId,
        collaboratorId,
        firmName: (data.inviterFirmName as string) ?? 'Despacho',
        acceptedAt: Timestamp.now(),
      }),
    },
    { merge: true }
  )
}

export interface CollaboratorMembership {
  firmId: string
  collaboratorId: string
  firmName: string
  acceptedAt: Date
}

export async function getCollaboratorIndex(uid: string): Promise<CollaboratorMembership[]> {
  const ref = doc(db, 'collaboratorIndex', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return []
  const raw = (snap.data().collaborations as Record<string, unknown>[]) ?? []
  return raw.map((c) => ({
    firmId: c.firmId as string,
    collaboratorId: c.collaboratorId as string,
    firmName: c.firmName as string,
    acceptedAt: toDate(c.acceptedAt),
  }))
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
  if (data.esDependiente !== undefined) cleanData.esDependiente = data.esDependiente

  await updateDoc(ref, cleanData)
}
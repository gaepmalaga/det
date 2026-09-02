import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Firm, Member, FirmMemberRole, TipStatus } from '@/types'

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

function mapFirm(id: string, data: Record<string, unknown>): Firm {
  const address = data.registeredAddress as Record<string, string> | undefined
  const titular = data.titular as Record<string, unknown> | undefined
  const legalRep = data.legalRepresentative as Record<string, string> | undefined

  return {
    id,
    legalType: data.legalType as 'individual' | 'company',
    legalName: data.legalName as string,
    tradeName: data.tradeName as string | undefined,
    taxId: data.taxId as string,
    rnsp: data.rnsp as string,
    registeredAddress: {
      street: address?.street ?? '',
      city: address?.city ?? '',
      province: address?.province ?? '',
      postalCode: address?.postalCode ?? '',
      country: address?.country ?? 'España',
    },
    legalRepresentative: legalRep
      ? { name: legalRep.name, taxId: legalRep.taxId, role: legalRep.role }
      : undefined,
    titular: {
      memberId: titular?.memberId as string ?? '',
      tipNumber: titular?.tipNumber as string ?? '',
      tipExpiry: toDateOrUndefined(titular?.tipExpiry),
    },
    customInvestigationTypes: (data.customInvestigationTypes as string[]) ?? [],
    contractTemplate: data.contractTemplate as Firm['contractTemplate'],
    registryLastPrintedEntry: data.registryLastPrintedEntry as number | undefined,
    registryLastPrintedAt: toDateOrUndefined(data.registryLastPrintedAt),
    status: data.status as Firm['status'],
    planId: data.planId as string,
    isDemo: data.isDemo as boolean | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

function mapMember(id: string, data: Record<string, unknown>): Member {
  return {
    id,
    firmId: data.firmId as string ?? '',
    userId: data.userId as string,
    email: data.email as string,
    displayName: data.displayName as string,
    photoURL: data.photoURL as string | undefined,
    role: data.role as FirmMemberRole,
    tipNumber: data.tipNumber as string | undefined,
    tipExpiry: toDateOrUndefined(data.tipExpiry),
    tipStatus: data.tipStatus as TipStatus | undefined,
    dependencyType: data.dependencyType as Member['dependencyType'],
    preferences: {
      autoAssignAsDetective: (data.preferences as Record<string, unknown>)?.autoAssignAsDetective as boolean ?? false,
    },
    isActive: data.isActive as boolean ?? true,
    invitationStatus: data.invitationStatus as Member['invitationStatus'],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getFirm(firmId: string): Promise<Firm | null> {
  const ref = doc(db, 'firms', firmId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapFirm(snap.id, snap.data() as Record<string, unknown>)
}

export interface UpdateFirmData {
  legalName?: string
  tradeName?: string
  taxId?: string
  rnsp?: string
  street?: string
  city?: string
  province?: string
  postalCode?: string
  tipNumber?: string
}

export async function updateFirm(firmId: string, data: UpdateFirmData): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  const cleanData: Record<string, unknown> = { updatedAt: serverTimestamp() }

  if (data.legalName !== undefined) cleanData.legalName = data.legalName
  if (data.tradeName !== undefined) cleanData.tradeName = data.tradeName
  if (data.taxId !== undefined) cleanData.taxId = data.taxId
  if (data.rnsp !== undefined) cleanData.rnsp = data.rnsp.toUpperCase()
  if (data.tipNumber !== undefined) {
    cleanData['titular.tipNumber'] = data.tipNumber.toUpperCase()
  }

  if (data.street || data.city || data.province || data.postalCode) {
    const current = await getDoc(ref)
    const currentAddress = (current.data()?.registeredAddress as Record<string, string>) ?? {}
    cleanData.registeredAddress = {
      ...currentAddress,
      ...(data.street !== undefined && { street: data.street }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.province !== undefined && { province: data.province }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
    }
  }

  await updateDoc(ref, cleanData)
}

export async function updateCustomInvestigationTypes(
  firmId: string,
  types: string[]
): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  await updateDoc(ref, {
    customInvestigationTypes: types,
    updatedAt: serverTimestamp(),
  })
}

export interface FirmTariffs {
  diurna?: number
  nocturna?: number
  festivo?: number
  finde?: number
  kmRate?: number
  dailyAllowance?: number
}

export async function updateContractTemplate(
  firmId: string,
  template: { name: string; body: string }
): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  await updateDoc(ref, {
    contractTemplate: template,
    updatedAt: serverTimestamp(),
  })
}

export async function updateFirmTariffs(firmId: string, tariffs: FirmTariffs): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  const cleanData: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (tariffs.diurna !== undefined) cleanData['tariffs.diurna'] = tariffs.diurna
  if (tariffs.nocturna !== undefined) cleanData['tariffs.nocturna'] = tariffs.nocturna
  if (tariffs.festivo !== undefined) cleanData['tariffs.festivo'] = tariffs.festivo
  if (tariffs.finde !== undefined) cleanData['tariffs.finde'] = tariffs.finde
  if (tariffs.kmRate !== undefined) cleanData['tariffs.kmRate'] = tariffs.kmRate
  if (tariffs.dailyAllowance !== undefined) cleanData['tariffs.dailyAllowance'] = tariffs.dailyAllowance
  await updateDoc(ref, cleanData)
}

export async function getFirmMembers(firmId: string): Promise<Member[]> {
  const ref = collection(db, 'firms', firmId, 'members')
  const snap = await getDocs(ref)
  return snap.docs.map((d) => mapMember(d.id, d.data() as Record<string, unknown>))
}

export interface InviteMemberData {
  email: string
  displayName: string
  role: FirmMemberRole
  tipNumber?: string
}

export async function addMember(firmId: string, data: InviteMemberData): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'members')
  const normalizedEmail = data.email.toLowerCase().trim()
  const cleanData: Record<string, unknown> = {
    firmId,
    userId: '',
    email: normalizedEmail,
    displayName: data.displayName,
    role: data.role,
    tipStatus: 'active' as TipStatus,
    dependencyType: 'dependent',
    preferences: { autoAssignAsDetective: false },
    isActive: true,
    // Sin cuenta vinculada todavía — se resuelve por email verificado en el
    // primer inicio de sesión de la persona invitada, ver claimMemberInvite.
    invitationStatus: 'pendiente',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (data.tipNumber) {
    cleanData.tipNumber = data.tipNumber.toUpperCase()
  }
  const docRef = await addDoc(ref, cleanData)

  // Índice top-level (doc ID = email) para que AuthContext.resolveUserType
  // pueda encontrar esta invitación por email sin necesitar una query —
  // mismo patrón que portalAccess (ID = email) y collaboratingFirms/
  // portalClients (campo email + isVerifiedEmail en las reglas).
  await setDoc(doc(db, 'memberInvites', normalizedEmail), {
    firmId,
    memberId: docRef.id,
    invitedAt: serverTimestamp(),
  })

  return docRef.id
}

export interface ClaimedMemberInvite {
  firmId: string
  memberId: string
  role: FirmMemberRole
}

// Vincula la cuenta recién autenticada de un miembro invitado por email
// (TeamTab → addMember) con el firms/{firmId}/members/{memberId} que ya
// existía para él, buscando por email verificado — mismo mecanismo que
// portalClients/collaboratingFirms usan para resolver identidad por email.
// Se llama desde AuthContext.resolveUserType en cada inicio de sesión
// mientras el usuario no tenga todavía su propio userFirmIndex.
export async function claimMemberInvite(
  uid: string,
  email: string
): Promise<ClaimedMemberInvite | null> {
  const normalizedEmail = email.toLowerCase().trim()
  const inviteRef = doc(db, 'memberInvites', normalizedEmail)
  const inviteSnap = await getDoc(inviteRef)
  if (!inviteSnap.exists()) return null

  const { firmId, memberId } = inviteSnap.data() as { firmId: string; memberId: string }
  const memberRef = doc(db, 'firms', firmId, 'members', memberId)
  const memberSnap = await getDoc(memberRef)
  if (!memberSnap.exists() || memberSnap.data().invitationStatus !== 'pendiente') return null

  const role = memberSnap.data().role as FirmMemberRole

  await updateDoc(memberRef, {
    userId: uid,
    invitationStatus: 'aceptada',
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'userFirmIndex', uid), {
    firmId,
    memberId,
    role,
    updatedAt: serverTimestamp(),
  })

  await deleteDoc(inviteRef)

  return { firmId, memberId, role }
}

export async function updateMember(
  firmId: string,
  memberId: string,
  data: Partial<InviteMemberData> & { isActive?: boolean; tipStatus?: TipStatus }
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'members', memberId)
  const cleanData: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (data.displayName !== undefined) cleanData.displayName = data.displayName
  if (data.role !== undefined) cleanData.role = data.role
  if (data.tipNumber !== undefined) cleanData.tipNumber = data.tipNumber.toUpperCase()
  if (data.isActive !== undefined) cleanData.isActive = data.isActive
  if (data.tipStatus !== undefined) cleanData.tipStatus = data.tipStatus
  await updateDoc(ref, cleanData)
}
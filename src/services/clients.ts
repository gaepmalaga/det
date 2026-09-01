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
import type { Client, ContactType, CorporateType } from '@/types'

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function mapClient(id: string, data: Record<string, unknown>): Client {
  const address = data.address as Record<string, string> | undefined
  return {
    id,
    firmId: data.firmId as string,
    clientType: data.clientType as ContactType,
    corporateType: data.corporateType as CorporateType | undefined,
    legalName: data.legalName as string,
    tradeName: data.tradeName as string | undefined,
    taxId: (data.taxId as string) ?? '',
    email: data.email as string,
    phone: data.phone as string,
    address: address
      ? {
          street: address.street ?? '',
          city: address.city ?? '',
          province: address.province ?? '',
          postalCode: address.postalCode ?? '',
        }
      : undefined,
    frameworkContractId: data.frameworkContractId as string | undefined,
    portalAccessEnabled: (data.portalAccessEnabled as boolean) ?? false,
    portalUserId: data.portalUserId as string | undefined,
    convertedFromContactId: data.convertedFromContactId as string | undefined,
    isActive: (data.isActive as boolean) ?? true,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
    updatedAt: toDate(data.updatedAt),
  }
}

export interface CreateClientData {
  clientType: ContactType
  corporateType?: CorporateType
  legalName: string
  tradeName?: string
  taxId?: string
  email: string
  phone: string
  convertedFromContactId?: string
}

export async function getClients(firmId: string): Promise<Client[]> {
  const ref = collection(db, 'firms', firmId, 'clients')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapClient(d.id, d.data() as Record<string, unknown>))
}

export async function getClient(firmId: string, clientId: string): Promise<Client | null> {
  const ref = doc(db, 'firms', firmId, 'clients', clientId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapClient(snap.id, snap.data() as Record<string, unknown>)
}

// Un mismo contacto puede aceptar varios presupuestos a lo largo del
// tiempo (nuevas investigaciones) — hay que reutilizar la ficha de
// cliente que ya se creó la primera vez, no duplicarla en cada aceptación.
export async function getClientByContactId(
  firmId: string,
  contactId: string
): Promise<Client | null> {
  const ref = collection(db, 'firms', firmId, 'clients')
  const q = query(ref, where('convertedFromContactId', '==', contactId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return mapClient(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>)
}

export async function createClient(
  firmId: string,
  userId: string,
  data: CreateClientData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'clients')

  const cleanData: Record<string, unknown> = {
    firmId,
    clientType: data.clientType,
    legalName: data.legalName,
    email: data.email,
    phone: data.phone,
    portalAccessEnabled: false,
    isActive: true,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.corporateType) cleanData.corporateType = data.corporateType
  if (data.tradeName) cleanData.tradeName = data.tradeName
  if (data.taxId) cleanData.taxId = data.taxId
  if (data.convertedFromContactId) cleanData.convertedFromContactId = data.convertedFromContactId

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function updateClient(
  firmId: string,
  clientId: string,
  data: Partial<CreateClientData>
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'clients', clientId)

  const cleanData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.clientType !== undefined) cleanData.clientType = data.clientType
  if (data.legalName !== undefined) cleanData.legalName = data.legalName
  if (data.email !== undefined) cleanData.email = data.email
  if (data.phone !== undefined) cleanData.phone = data.phone
  if (data.taxId) cleanData.taxId = data.taxId
  if (data.tradeName) cleanData.tradeName = data.tradeName
  if (data.corporateType) cleanData.corporateType = data.corporateType

  await updateDoc(ref, cleanData)
}

export async function setClientFrameworkContract(
  firmId: string,
  clientId: string,
  frameworkContractId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'clients', clientId)
  await updateDoc(ref, {
    frameworkContractId,
    updatedAt: serverTimestamp(),
  })
}
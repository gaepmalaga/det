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
import type { Contact } from '@/types'

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function mapContact(id: string, data: Record<string, unknown>): Contact {
  return {
    id,
    firmId: data.firmId as string,
    referenceNumber: data.referenceNumber as string,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    contactName: data.contactName as string,
    contactEmail: data.contactEmail as string,
    contactPhone: data.contactPhone as string,
    contactType: data.contactType as Contact['contactType'],
    companyName: data.companyName as string | undefined,
    assignedTo: data.assignedTo as string | undefined,
    notes: data.notes as string | undefined,
    createdBy: data.createdBy as string,
  }
}

export async function getContacts(firmId: string): Promise<Contact[]> {
  const ref = collection(db, 'firms', firmId, 'contacts')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapContact(d.id, d.data() as Record<string, unknown>))
}

export async function getContact(firmId: string, contactId: string): Promise<Contact | null> {
  const ref = doc(db, 'firms', firmId, 'contacts', contactId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapContact(snap.id, snap.data() as Record<string, unknown>)
}

export interface CreateContactData {
  contactName: string
  contactEmail: string
  contactPhone: string
  contactType: Contact['contactType']
  companyName?: string
  assignedTo?: string
  notes?: string
}

export async function createContact(
  firmId: string,
  userId: string,
  data: CreateContactData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'contacts')

  const countSnap = await getDocs(ref)
  const count = countSnap.size + 1
  const referenceNumber = `CON-${String(count).padStart(4, '0')}`

  // Firestore no acepta undefined — construimos el objeto limpio
  const cleanData: Record<string, unknown> = {
    firmId,
    referenceNumber,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    contactType: data.contactType,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.companyName) cleanData.companyName = data.companyName
  if (data.notes) cleanData.notes = data.notes
  if (data.assignedTo) cleanData.assignedTo = data.assignedTo

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function updateContact(
  firmId: string,
  contactId: string,
  data: Partial<CreateContactData>
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'contacts', contactId)

  const cleanData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.contactName !== undefined) cleanData.contactName = data.contactName
  if (data.contactEmail !== undefined) cleanData.contactEmail = data.contactEmail
  if (data.contactPhone !== undefined) cleanData.contactPhone = data.contactPhone
  if (data.contactType !== undefined) cleanData.contactType = data.contactType
  if (data.companyName) cleanData.companyName = data.companyName
  if (data.notes) cleanData.notes = data.notes
  if (data.assignedTo) cleanData.assignedTo = data.assignedTo

  await updateDoc(ref, cleanData)
}

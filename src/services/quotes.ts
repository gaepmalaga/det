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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { Quote, QuoteStatus } from '@/types'

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function mapQuote(id: string, data: Record<string, unknown>): Quote {
  return {
    id,
    firmId: data.firmId as string,
    contactId: data.contactId as string,
    quoteNumber: data.quoteNumber as string,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    investigationType: data.investigationType as string,
    investigationTypeCustom: data.investigationTypeCustom as string | undefined,
    description: data.description as string,
    amount: (data.amount as number) ?? 0,
    status: data.status as QuoteStatus,
    rejectionReason: data.rejectionReason as string | undefined,
    clientId: data.clientId as string | undefined,
    contractId: data.contractId as string | undefined,
    caseId: data.caseId as string | undefined,
    documentUrl: data.documentUrl as string | undefined,
    documentName: data.documentName as string | undefined,
    objectScope: data.objectScope as string | undefined,
    legitimateInterest: data.legitimateInterest as string | undefined,
    investigatedName: data.investigatedName as string | undefined,
    investigatedAddress: data.investigatedAddress as string | undefined,
    assignedDetectiveId: data.assignedDetectiveId as string | undefined,
    assignedDetectiveTip: data.assignedDetectiveTip as string | undefined,
    createdBy: data.createdBy as string,
  }
}

export async function getQuotes(firmId: string): Promise<Quote[]> {
  const ref = collection(db, 'firms', firmId, 'quotes')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapQuote(d.id, d.data() as Record<string, unknown>))
}

export async function getQuotesByContact(firmId: string, contactId: string): Promise<Quote[]> {
  const ref = collection(db, 'firms', firmId, 'quotes')
  const q = query(ref, where('contactId', '==', contactId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapQuote(d.id, d.data() as Record<string, unknown>))
}

export async function getQuote(firmId: string, quoteId: string): Promise<Quote | null> {
  const ref = doc(db, 'firms', firmId, 'quotes', quoteId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapQuote(snap.id, snap.data() as Record<string, unknown>)
}

export interface CreateQuoteData {
  contactId: string
  investigationType: string
  investigationTypeCustom?: string
  description: string
  amount: number
}

export async function createQuote(
  firmId: string,
  userId: string,
  data: CreateQuoteData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'quotes')

  const countSnap = await getDocs(ref)
  const count = countSnap.size + 1
  const quoteNumber = `PRE-${String(count).padStart(4, '0')}`

  const cleanData: Record<string, unknown> = {
    firmId,
    contactId: data.contactId,
    quoteNumber,
    investigationType: data.investigationType,
    description: data.description,
    amount: data.amount,
    status: 'enviado' as QuoteStatus,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.investigationTypeCustom) cleanData.investigationTypeCustom = data.investigationTypeCustom

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function uploadQuoteDocument(
  firmId: string,
  quoteId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `firms/${firmId}/quotes/${quoteId}/${file.name}`)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  const docRef = doc(db, 'firms', firmId, 'quotes', quoteId)
  await updateDoc(docRef, {
    documentUrl: url,
    documentName: file.name,
    updatedAt: serverTimestamp(),
  })

  return url
}

export async function rejectQuote(
  firmId: string,
  quoteId: string,
  rejectionReason?: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'quotes', quoteId)
  const updateData: Record<string, unknown> = {
    status: 'rechazado' as QuoteStatus,
    updatedAt: serverTimestamp(),
  }
  if (rejectionReason) updateData.rejectionReason = rejectionReason
  await updateDoc(ref, updateData)
}

export interface AcceptQuoteData {
  clientId: string
  objectScope: string
  legitimateInterest: string
  investigatedName: string
  investigatedAddress: string
  assignedDetectiveId: string
  assignedDetectiveTip: string
}

// Acepta el presupuesto y guarda ya los datos legales del futuro
// expediente — el expediente en sí no se crea hasta que el contrato
// quede firmado (ver services/caseOpening.ts).
export async function acceptQuote(
  firmId: string,
  quoteId: string,
  data: AcceptQuoteData
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'quotes', quoteId)
  await updateDoc(ref, {
    status: 'aceptado' as QuoteStatus,
    clientId: data.clientId,
    objectScope: data.objectScope,
    legitimateInterest: data.legitimateInterest,
    investigatedName: data.investigatedName,
    investigatedAddress: data.investigatedAddress,
    assignedDetectiveId: data.assignedDetectiveId,
    assignedDetectiveTip: data.assignedDetectiveTip,
    updatedAt: serverTimestamp(),
  })
}

export async function setQuoteContract(
  firmId: string,
  quoteId: string,
  contractId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'quotes', quoteId)
  await updateDoc(ref, { contractId, updatedAt: serverTimestamp() })
}

export async function setQuoteCase(
  firmId: string,
  quoteId: string,
  caseId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'quotes', quoteId)
  await updateDoc(ref, { caseId, updatedAt: serverTimestamp() })
}

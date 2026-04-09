import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { RegistryEntry, RegistryEntryStatus, ContactType } from '@/types'

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

function mapEntry(id: string, data: Record<string, unknown>): RegistryEntry {
  const amendments = Array.isArray(data.amendments)
    ? (data.amendments as Record<string, unknown>[]).map((a) => ({
        amendedAt: toDate(a.amendedAt),
        amendedBy: a.amendedBy as string,
        field: a.field as string,
        oldValue: a.oldValue as string,
        newValue: a.newValue as string,
        reason: a.reason as string,
      }))
    : []

  return {
    id,
    firmId: data.firmId as string,
    entryNumber: data.entryNumber as number,
    entryDate: toDate(data.entryDate),
    firmRnsp: data.firmRnsp as string,
    branchId: data.branchId as string | undefined,
    clientName: data.clientName as string,
    clientTaxId: (data.clientTaxId as string) ?? '',
    clientType: data.clientType as ContactType,
    investigationObject: data.investigationObject as string,
    detectiveName: data.detectiveName as string,
    detectiveTip: data.detectiveTip as string,
    startDate: toDate(data.startDate),
    endDate: toDateOrUndefined(data.endDate),
    caseId: data.caseId as string,
    caseNumber: data.caseNumber as string,
    reportId: data.reportId as string | undefined,
    status: data.status as RegistryEntryStatus,
    amendments,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
  }
}

export interface CreateRegistryEntryData {
  firmRnsp: string
  clientName: string
  clientTaxId: string
  clientType: ContactType
  investigationObject: string
  detectiveName: string
  detectiveTip: string
  caseId: string
  caseNumber: string
}

export async function getRegistryEntries(firmId: string): Promise<RegistryEntry[]> {
  const ref = collection(db, 'firms', firmId, 'registryBooks')
  const q = query(ref, orderBy('entryNumber', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapEntry(d.id, d.data() as Record<string, unknown>))
}

export async function createRegistryEntry(
  firmId: string,
  userId: string,
  data: CreateRegistryEntryData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'registryBooks')
  const countSnap = await getDocs(ref)
  const count = countSnap.size + 1

  const cleanData: Record<string, unknown> = {
    firmId,
    entryNumber: count,
    entryDate: serverTimestamp(),
    firmRnsp: data.firmRnsp,
    clientName: data.clientName,
    clientTaxId: data.clientTaxId,
    clientType: data.clientType,
    investigationObject: data.investigationObject,
    detectiveName: data.detectiveName,
    detectiveTip: data.detectiveTip,
    startDate: serverTimestamp(),
    caseId: data.caseId,
    caseNumber: data.caseNumber,
    status: 'abierto' as RegistryEntryStatus,
    amendments: [],
    createdBy: userId,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function closeRegistryEntry(
  firmId: string,
  entryId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'registryBooks', entryId)
  await updateDoc(ref, {
    status: 'cerrado' as RegistryEntryStatus,
    endDate: serverTimestamp(),
  })
}

export async function amendRegistryEntry(
  firmId: string,
  entryId: string,
  userId: string,
  field: string,
  oldValue: string,
  newValue: string,
  reason: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'registryBooks', entryId)
  const amendment = {
    amendedAt: Timestamp.now(),
    amendedBy: userId,
    field,
    oldValue,
    newValue,
    reason,
  }
  await updateDoc(ref, {
    [field]: newValue,
    amendments: arrayUnion(amendment),
  })
}
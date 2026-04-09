import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { CaseAction, RateType } from '@/types'

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function mapAction(id: string, data: Record<string, unknown>): CaseAction {
  return {
    id,
    caseId: data.caseId as string,
    date: toDate(data.date),
    startTime: data.startTime as string,
    endTime: data.endTime as string,
    hoursWorked: data.hoursWorked as number,
    rateType: data.rateType as RateType,
    location: data.location as string,
    description: data.description as string,
    detectiveId: data.detectiveId as string,
    detectiveTip: data.detectiveTip as string,
    evidenceIds: (data.evidenceIds as string[]) ?? [],
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
  }
}

export interface CreateActionData {
  date: Date
  startTime: string
  endTime: string
  rateType: RateType
  location: string
  description: string
  detectiveId: string
  detectiveTip: string
}

function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  const diff = endMinutes - startMinutes
  if (diff <= 0) return 0
  return Math.round((diff / 60) * 100) / 100
}

export async function getCaseActions(
  firmId: string,
  caseId: string
): Promise<CaseAction[]> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'actions')
  const q = query(ref, orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapAction(d.id, d.data() as Record<string, unknown>))
}

export async function createAction(
  firmId: string,
  caseId: string,
  userId: string,
  data: CreateActionData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'actions')
  const hoursWorked = calculateHours(data.startTime, data.endTime)

  const docRef = await addDoc(ref, {
    caseId,
    date: Timestamp.fromDate(data.date),
    startTime: data.startTime,
    endTime: data.endTime,
    hoursWorked,
    rateType: data.rateType,
    location: data.location,
    description: data.description,
    detectiveId: data.detectiveId,
    detectiveTip: data.detectiveTip,
    evidenceIds: [],
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  return docRef.id
}

export async function updateAction(
  firmId: string,
  caseId: string,
  actionId: string,
  data: Partial<CreateActionData>
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'actions', actionId)
  const cleanData: Record<string, unknown> = {}

  if (data.date) cleanData.date = Timestamp.fromDate(data.date)
  if (data.startTime !== undefined) cleanData.startTime = data.startTime
  if (data.endTime !== undefined) cleanData.endTime = data.endTime
  if (data.startTime && data.endTime) {
    cleanData.hoursWorked = calculateHours(data.startTime, data.endTime)
  }
  if (data.rateType !== undefined) cleanData.rateType = data.rateType
  if (data.location !== undefined) cleanData.location = data.location
  if (data.description !== undefined) cleanData.description = data.description

  await updateDoc(ref, cleanData)
}

export async function deleteAction(
  firmId: string,
  caseId: string,
  actionId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'actions', actionId)
  await deleteDoc(ref)
}
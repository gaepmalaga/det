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
import type { CaseAction } from '@/types'

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
    description: data.description as string,
    locationLat: data.locationLat as number | undefined,
    locationLng: data.locationLng as number | undefined,
    detectiveId: data.detectiveId as string,
    detectiveTip: data.detectiveTip as string,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
  }
}

export interface CreateActionData {
  description: string
  locationLat?: number
  locationLng?: number
  detectiveId: string
  detectiveTip: string
}

export async function getCaseActions(
  firmId: string,
  caseId: string
): Promise<CaseAction[]> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'actions')
  const q = query(ref, orderBy('createdAt', 'desc'))
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

  const cleanData: Record<string, unknown> = {
    caseId,
    description: data.description,
    detectiveId: data.detectiveId,
    detectiveTip: data.detectiveTip,
    createdBy: userId,
    createdAt: serverTimestamp(),
  }

  if (data.locationLat !== undefined) cleanData.locationLat = data.locationLat
  if (data.locationLng !== undefined) cleanData.locationLng = data.locationLng

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function updateActionDescription(
  firmId: string,
  caseId: string,
  actionId: string,
  description: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'actions', actionId)
  await updateDoc(ref, { description })
}

export async function deleteAction(
  firmId: string,
  caseId: string,
  actionId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'actions', actionId)
  await deleteDoc(ref)
}

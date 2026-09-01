import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { FrameworkContract, FrameworkContractStatus } from '@/types'

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function mapFrameworkContract(id: string, data: Record<string, unknown>): FrameworkContract {
  return {
    id,
    firmId: data.firmId as string,
    clientId: data.clientId as string,
    fileName: data.fileName as string,
    fileUrl: data.fileUrl as string,
    notes: data.notes as string | undefined,
    status: (data.status as FrameworkContractStatus) ?? 'activo',
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
  }
}

export async function getFrameworkContract(
  firmId: string,
  contractId: string
): Promise<FrameworkContract | null> {
  const ref = doc(db, 'firms', firmId, 'frameworkContracts', contractId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapFrameworkContract(snap.id, snap.data() as Record<string, unknown>)
}

export async function uploadFrameworkContract(
  firmId: string,
  userId: string,
  clientId: string,
  file: File,
  notes?: string
): Promise<string> {
  const contractsRef = collection(db, 'firms', firmId, 'frameworkContracts')
  const docRef = await addDoc(contractsRef, {
    firmId,
    clientId,
    fileName: file.name,
    fileUrl: '',
    status: 'activo' as FrameworkContractStatus,
    ...(notes ? { notes } : {}),
    createdBy: userId,
    createdAt: serverTimestamp(),
  })

  const storageRef = ref(
    storage,
    `firms/${firmId}/frameworkContracts/${docRef.id}/${file.name}`
  )
  await uploadBytes(storageRef, file)
  const fileUrl = await getDownloadURL(storageRef)
  await updateDoc(docRef, { fileUrl })

  return docRef.id
}

export async function setFrameworkContractStatus(
  firmId: string,
  contractId: string,
  status: FrameworkContractStatus
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'frameworkContracts', contractId)
  await updateDoc(ref, { status })
}

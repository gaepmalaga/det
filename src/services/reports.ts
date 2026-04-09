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

export type ReportStatus = 'borrador' | 'en_revision' | 'aprobado' | 'entregado' | 'archivado'

export interface ReportDetective {
  detectiveId: string
  detectiveName: string
  detectiveTip: string
}

export interface Report {
  id: string
  firmId: string
  caseId: string
  caseNumber: string
  status: ReportStatus

  // Campos mínimos legales art. 49.1 Ley 5/2014
  registryNumber: string
  clientName: string
  clientTaxId: string
  serviceObject: string
  methodsUsed: string
  results: string
  detectives: ReportDetective[]
  actionsPerformed: string

  // Campos adicionales
  conclusions?: string
  observations?: string

  // Entrega
  deliveredAt?: Date
  deliveredTo?: string

  // Trazabilidad
  createdAt: Date
  createdBy: string
  updatedAt: Date
  approvedAt?: Date
  approvedBy?: string
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

function mapReport(id: string, data: Record<string, unknown>): Report {
  const detectives = Array.isArray(data.detectives)
    ? (data.detectives as Record<string, unknown>[]).map((d) => ({
        detectiveId: d.detectiveId as string,
        detectiveName: d.detectiveName as string,
        detectiveTip: d.detectiveTip as string,
      }))
    : []

  return {
    id,
    firmId: data.firmId as string,
    caseId: data.caseId as string,
    caseNumber: data.caseNumber as string,
    status: data.status as ReportStatus,
    registryNumber: data.registryNumber as string,
    clientName: data.clientName as string,
    clientTaxId: (data.clientTaxId as string) || '',
    serviceObject: data.serviceObject as string,
    methodsUsed: data.methodsUsed as string,
    results: data.results as string,
    detectives,
    actionsPerformed: data.actionsPerformed as string,
    conclusions: data.conclusions as string | undefined,
    observations: data.observations as string | undefined,
    deliveredAt: toDateOrUndefined(data.deliveredAt),
    deliveredTo: data.deliveredTo as string | undefined,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
    updatedAt: toDate(data.updatedAt),
    approvedAt: toDateOrUndefined(data.approvedAt),
    approvedBy: data.approvedBy as string | undefined,
  }
}

export async function getCaseReport(firmId: string, caseId: string): Promise<Report | null> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'reports')
  const snap = await getDocs(ref)
  if (snap.empty) return null
  const d = snap.docs[0]
  return mapReport(d.id, d.data() as Record<string, unknown>)
}

export async function getReport(firmId: string, caseId: string, reportId: string): Promise<Report | null> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'reports', reportId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapReport(snap.id, snap.data() as Record<string, unknown>)
}

export interface CreateReportData {
  caseNumber: string
  clientName: string
  clientTaxId?: string
  serviceObject: string
  methodsUsed: string
  results: string
  detectives: ReportDetective[]
  actionsPerformed: string
  conclusions?: string
  observations?: string
}

export async function createReport(
  firmId: string,
  caseId: string,
  userId: string,
  data: CreateReportData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'reports')

  const cleanData: Record<string, unknown> = {
    firmId,
    caseId,
    caseNumber: data.caseNumber,
    status: 'borrador' as ReportStatus,
    registryNumber: data.caseNumber,
    clientName: data.clientName,
    clientTaxId: data.clientTaxId || '',
    serviceObject: data.serviceObject,
    methodsUsed: data.methodsUsed,
    results: data.results,
    detectives: data.detectives,
    actionsPerformed: data.actionsPerformed,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.conclusions) cleanData.conclusions = data.conclusions
  if (data.observations) cleanData.observations = data.observations

  const docRef = await addDoc(ref, cleanData)

  // Vincular el reportId al expediente
  await updateDoc(doc(db, 'firms', firmId, 'cases', caseId), {
    reportId: docRef.id,
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function updateReport(
  firmId: string,
  caseId: string,
  reportId: string,
  data: Partial<CreateReportData>
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'reports', reportId)
  const cleanData: Record<string, unknown> = { updatedAt: serverTimestamp() }

  if (data.clientName !== undefined) cleanData.clientName = data.clientName
  if (data.clientTaxId !== undefined) cleanData.clientTaxId = data.clientTaxId
  if (data.serviceObject !== undefined) cleanData.serviceObject = data.serviceObject
  if (data.methodsUsed !== undefined) cleanData.methodsUsed = data.methodsUsed
  if (data.results !== undefined) cleanData.results = data.results
  if (data.detectives !== undefined) cleanData.detectives = data.detectives
  if (data.actionsPerformed !== undefined) cleanData.actionsPerformed = data.actionsPerformed
  if (data.conclusions !== undefined) cleanData.conclusions = data.conclusions
  if (data.observations !== undefined) cleanData.observations = data.observations

  await updateDoc(ref, cleanData)
}

export async function approveReport(
  firmId: string,
  caseId: string,
  reportId: string,
  userId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'reports', reportId)
  await updateDoc(ref, {
    status: 'aprobado' as ReportStatus,
    approvedAt: serverTimestamp(),
    approvedBy: userId,
    updatedAt: serverTimestamp(),
  })
}

export async function deliverReport(
  firmId: string,
  caseId: string,
  reportId: string,
  deliveredTo: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'cases', caseId, 'reports', reportId)
  await updateDoc(ref, {
    status: 'entregado' as ReportStatus,
    deliveredAt: serverTimestamp(),
    deliveredTo,
    updatedAt: serverTimestamp(),
  })
}
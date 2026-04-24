import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type AuditEventType =
  | 'case_created'
  | 'case_status_changed'
  | 'contract_created'
  | 'contract_signed'
  | 'action_added'
  | 'action_deleted'
  | 'evidence_added'
  | 'evidence_deleted'
  | 'report_created'
  | 'report_approved'
  | 'report_delivered'
  | 'portal_access_granted'
  | 'portal_access_revoked'
  | 'portal_document_released'
  | 'portal_message_sent'
  | 'registry_entry_created'
  | 'registry_entry_closed'

export interface AuditLog {
  id: string
  firmId: string
  caseId: string
  eventType: AuditEventType
  description: string
  userId: string
  userName: string
  metadata?: Record<string, string>
  createdAt: Date
}

const EVENT_LABELS: Record<AuditEventType, string> = {
  case_created: 'Expediente creado',
  case_status_changed: 'Estado del expediente cambiado',
  contract_created: 'Contrato creado',
  contract_signed: 'Contrato firmado',
  action_added: 'Actuación registrada',
  action_deleted: 'Actuación eliminada',
  evidence_added: 'Evidencia añadida',
  evidence_deleted: 'Evidencia eliminada',
  report_created: 'Informe creado',
  report_approved: 'Informe aprobado',
  report_delivered: 'Informe entregado al cliente',
  portal_access_granted: 'Acceso al portal concedido',
  portal_access_revoked: 'Acceso al portal revocado',
  portal_document_released: 'Documento liberado al cliente',
  portal_message_sent: 'Mensaje enviado al cliente',
  registry_entry_created: 'Asiento en libro-registro creado',
  registry_entry_closed: 'Asiento en libro-registro cerrado',
}

const EVENT_COLORS: Record<AuditEventType, string> = {
  case_created: 'bg-blue-500',
  case_status_changed: 'bg-slate-400',
  contract_created: 'bg-violet-500',
  contract_signed: 'bg-green-500',
  action_added: 'bg-amber-500',
  action_deleted: 'bg-red-400',
  evidence_added: 'bg-orange-500',
  evidence_deleted: 'bg-red-400',
  report_created: 'bg-blue-500',
  report_approved: 'bg-green-500',
  report_delivered: 'bg-green-600',
  portal_access_granted: 'bg-teal-500',
  portal_access_revoked: 'bg-red-500',
  portal_document_released: 'bg-teal-400',
  portal_message_sent: 'bg-sky-400',
  registry_entry_created: 'bg-indigo-500',
  registry_entry_closed: 'bg-indigo-400',
}

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

export function getEventLabel(eventType: AuditEventType): string {
  return EVENT_LABELS[eventType] ?? eventType
}

export function getEventColor(eventType: AuditEventType): string {
  return EVENT_COLORS[eventType] ?? 'bg-slate-400'
}

export async function getCaseAuditLogs(
  firmId: string,
  caseId: string
): Promise<AuditLog[]> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'auditLogs')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>
    return {
      id: d.id,
      firmId: data.firmId as string,
      caseId: data.caseId as string,
      eventType: data.eventType as AuditEventType,
      description: data.description as string,
      userId: data.userId as string,
      userName: data.userName as string,
      metadata: data.metadata as Record<string, string> | undefined,
      createdAt: toDate(data.createdAt),
    }
  })
}

export async function createAuditLog(
  firmId: string,
  caseId: string,
  userId: string,
  userName: string,
  eventType: AuditEventType,
  description: string,
  metadata?: Record<string, string>
): Promise<void> {
  const ref = collection(db, 'firms', firmId, 'cases', caseId, 'auditLogs')
  const data: Record<string, unknown> = {
    firmId,
    caseId,
    eventType,
    description,
    userId,
    userName,
    createdAt: serverTimestamp(),
  }
  if (metadata) data.metadata = metadata
  await addDoc(ref, data)
}
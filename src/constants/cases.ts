import type { CaseStatus, QuoteStatus } from '@/types'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  borrador: 'Sin enviar',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  borrador: 'bg-muted text-muted-foreground border-border',
  enviado: 'bg-blue-50 text-blue-700 border-blue-200',
  aceptado: 'bg-green-50 text-green-700 border-green-200',
  rechazado: 'bg-red-50 text-red-700 border-red-200',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  trabajo_terminado: 'Trabajo terminado',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
}

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  activo: 'bg-green-50 text-green-700 border-green-200',
  suspendido: 'bg-orange-50 text-orange-700 border-orange-200',
  trabajo_terminado: 'bg-teal-50 text-teal-700 border-teal-200',
  cerrado: 'bg-slate-50 text-slate-700 border-slate-200',
  archivado: 'bg-slate-50 text-slate-500 border-slate-200',
}

export const CASE_STATUS_FLOW: Partial<Record<CaseStatus, CaseStatus[]>> = {
  activo: ['suspendido', 'trabajo_terminado'],
  suspendido: ['activo', 'trabajo_terminado'],
  trabajo_terminado: ['cerrado'],
}

export const COMPLIANCE_COLORS = {
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
}

export const COMPLIANCE_LABELS = {
  green: 'Cumplimiento correcto',
  amber: 'Revisión recomendada',
  red: 'Acción requerida',
}
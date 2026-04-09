import type { CaseStatus, LeadStatus } from '@/types'

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: 'Nuevo',
  en_revision: 'En revisión',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: 'bg-blue-50 text-blue-700 border-blue-200',
  en_revision: 'bg-amber-50 text-amber-700 border-amber-200',
  aceptado: 'bg-green-50 text-green-700 border-green-200',
  rechazado: 'bg-red-50 text-red-700 border-red-200',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  revision: 'En revisión',
  presupuesto: 'Presupuesto enviado',
  contrato_pendiente: 'Contrato pendiente',
  activo: 'Activo',
  suspendido: 'Suspendido',
  trabajo_terminado: 'Trabajo terminado',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
  rechazado: 'Rechazado',
}

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  revision: 'bg-blue-50 text-blue-700 border-blue-200',
  presupuesto: 'bg-purple-50 text-purple-700 border-purple-200',
  contrato_pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  activo: 'bg-green-50 text-green-700 border-green-200',
  suspendido: 'bg-orange-50 text-orange-700 border-orange-200',
  trabajo_terminado: 'bg-teal-50 text-teal-700 border-teal-200',
  cerrado: 'bg-slate-50 text-slate-700 border-slate-200',
  archivado: 'bg-slate-50 text-slate-500 border-slate-200',
  rechazado: 'bg-red-50 text-red-700 border-red-200',
}

export const CASE_STATUS_FLOW: Partial<Record<CaseStatus, CaseStatus[]>> = {
  revision: ['presupuesto', 'rechazado'],
  presupuesto: ['contrato_pendiente', 'rechazado'],
  contrato_pendiente: ['activo', 'rechazado'],
  activo: ['suspendido', 'trabajo_terminado'],
  suspendido: ['activo', 'trabajo_terminado'],
  trabajo_terminado: ['cerrado'],
}

export const RATE_TYPE_LABELS = {
  diurna: 'Diurna',
  nocturna: 'Nocturna',
  festivo: 'Festivo',
  finde: 'Fin de semana',
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
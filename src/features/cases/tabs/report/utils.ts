import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CaseAction } from '@/types'
import type { Report, ReportStatus } from '@/services/reports'

export function compileActionsText(actions: CaseAction[]): string {
  const chronological = [...actions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )
  return chronological
    .map((a) => {
      const when = format(a.createdAt, "dd/MM/yyyy HH:mm", { locale: es })
      const location =
        a.locationLat !== undefined && a.locationLng !== undefined
          ? ` (ubicación: ${a.locationLat.toFixed(5)}, ${a.locationLng.toFixed(5)})`
          : ''
      return `[${when}]${location} ${a.description}`
    })
    .join('\n\n')
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  entregado: 'Entregado',
  archivado: 'Archivado',
}

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  borrador: 'bg-muted text-foreground border-border',
  en_revision: 'bg-amber-50 text-amber-700 border-amber-200',
  aprobado: 'bg-blue-50 text-blue-700 border-blue-200',
  entregado: 'bg-green-50 text-green-700 border-green-200',
  archivado: 'bg-muted text-muted-foreground border-border',
}

// El art. 49.1 de la Ley 5/2014 fija el contenido mínimo del informe.
// Un borrador puede estar a medias —para eso es un borrador—, pero
// aprobarlo es decir que está terminado, y ahí sí tiene que estarlo.
export function faltanEnInforme(r: Report | null): string[] {
  if (!r) return []
  const campos: Array<[string, string]> = [
    [r.clientName, 'el contratante'],
    [r.serviceObject, 'el objeto del servicio'],
    [r.methodsUsed, 'los medios empleados'],
    [r.actionsPerformed, 'las actuaciones practicadas'],
    [r.results, 'los resultados'],
  ]
  return campos.filter(([v]) => !v?.trim()).map(([, n]) => n)
}

export interface ReportFormState {
  clientName: string
  clientTaxId: string
  serviceObject: string
  methodsUsed: string
  results: string
  actionsPerformed: string
  conclusions: string
  observations: string
}

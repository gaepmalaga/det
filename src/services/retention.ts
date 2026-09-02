import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Case } from '@/types'

// Art. 49.4 de la Ley 5/2014 contiene dos reglas que se confunden con
// facilidad porque van en la misma frase:
//
//   «Los informes de investigación deberán conservarse archivados, al
//    menos, durante tres años [...]. Las imágenes y los sonidos grabados
//    durante las investigaciones se destruirán tres años después de su
//    finalización, salvo que estén relacionadas con un procedimiento
//    judicial, una investigación policial o un procedimiento sancionador.»
//
// El informe tiene un mínimo de conservación: pasados tres años se puede
// destruir, pero no hay que hacerlo. Las imágenes y sonidos tienen un
// deber de destrucción con fecha. Solo la segunda genera una obligación
// que la plataforma deba recordar.
//
// Y el plazo cuenta desde la FINALIZACIÓN de la investigación, no desde
// que se abrió el expediente: un asunto que dura año y medio conserva su
// material hasta cuatro años y medio después de abrirse.
export const RETENTION_YEARS = 3

export function destructionDueDate(caseData: Case): Date | null {
  const finished = caseData.closedAt
  if (!finished) return null
  const due = new Date(finished)
  due.setFullYear(due.getFullYear() + RETENTION_YEARS)
  return due
}

export type RetentionState =
  | 'sin_material' // no se grabó nada que haya que destruir
  | 'en_curso' // el asunto sigue abierto, el plazo no ha empezado
  | 'conservando' // dentro de los tres años
  | 'proximo' // quedan menos de 90 días
  | 'vencido' // hay que destruirlo ya
  | 'retenido' // procedimiento judicial, policial o sancionador
  | 'destruido'

export interface RetentionStatus {
  state: RetentionState
  dueDate: Date | null
  daysLeft: number | null
}

const WARN_DAYS = 90

export function retentionStatus(caseData: Case, now = new Date()): RetentionStatus {
  if (caseData.graphicMaterialDestroyedAt) {
    return { state: 'destruido', dueDate: null, daysLeft: null }
  }
  if (!caseData.hasGraphicMaterial) {
    return { state: 'sin_material', dueDate: null, daysLeft: null }
  }

  const dueDate = destructionDueDate(caseData)
  if (!dueDate) return { state: 'en_curso', dueDate: null, daysLeft: null }

  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000)

  // La retención judicial se comprueba después de calcular la fecha, para
  // que la pantalla pueda seguir enseñando cuándo habría tocado.
  if (caseData.hasActiveException) return { state: 'retenido', dueDate, daysLeft }

  if (daysLeft <= 0) return { state: 'vencido', dueDate, daysLeft }
  if (daysLeft <= WARN_DAYS) return { state: 'proximo', dueDate, daysLeft }
  return { state: 'conservando', dueDate, daysLeft }
}

export const RETENTION_LABELS: Record<RetentionState, string> = {
  sin_material: 'Sin material que destruir',
  en_curso: 'Investigación en curso',
  conservando: 'En conservación',
  proximo: 'Destrucción próxima',
  vencido: 'Destrucción vencida',
  retenido: 'Retenido por procedimiento',
  destruido: 'Destruido',
}

export interface GraphicMaterialData {
  hasGraphicMaterial: boolean
  graphicMaterialLocation?: string
  hasActiveException: boolean
  exceptionReason?: string
}

export async function setGraphicMaterial(
  firmId: string,
  caseId: string,
  data: GraphicMaterialData
): Promise<void> {
  const payload: Record<string, unknown> = {
    hasGraphicMaterial: data.hasGraphicMaterial,
    hasActiveException: data.hasActiveException,
    graphicMaterialLocation: data.graphicMaterialLocation ?? '',
    exceptionReason: data.exceptionReason ?? '',
    updatedAt: serverTimestamp(),
  }
  await updateDoc(doc(db, 'firms', firmId, 'cases', caseId), payload)
}

/**
 * Deja constancia de que el material se ha destruido. Es un registro, no
 * un borrado: la plataforma no guarda las grabaciones —están en el disco
 * o la tarjeta del detective— así que lo único que puede hacer es anotar
 * quién las destruyó y cuándo, que es lo que hay que poder enseñar.
 */
export async function recordDestruction(
  firmId: string,
  caseId: string,
  userId: string,
  when = new Date()
): Promise<void> {
  await updateDoc(doc(db, 'firms', firmId, 'cases', caseId), {
    graphicMaterialDestroyedAt: Timestamp.fromDate(when),
    graphicMaterialDestroyedBy: userId,
    destructionCompletedAt: Timestamp.fromDate(when),
    updatedAt: serverTimestamp(),
  })
}

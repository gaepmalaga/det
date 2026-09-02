import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getCases } from './cases'
import { getRegistryEntries } from './registry'
import { retentionStatus, type RetentionStatus } from './retention'
import type { Case, ComplianceStatus, RegistryEntry } from '@/types'

// Antes esto leía `complianceIssues` del expediente, un campo que se
// escribía una sola vez al crearlo y no se volvía a tocar: seguía diciendo
// «Interés legítimo pendiente de validar» mucho después de haberse
// rellenado. Ahora las reglas se evalúan sobre los datos de verdad, así
// que no pueden quedarse obsoletas — el mismo criterio que en la revisión
// del asiento (services/dossier.ts) y en el estado de las oportunidades
// (services/pipeline.ts).
export interface ComplianceIssue {
  /** Qué falla, en una frase. */
  label: string
  /** Por qué importa, con la norma detrás cuando la hay. */
  detail: string
  severity: ComplianceStatus
}

export interface ComplianceAlert {
  caseId: string
  caseNumber: string
  investigationType: string
  status: ComplianceStatus
  issues: ComplianceIssue[]
  /** Nº de asiento, que es como lo va a buscar quien inspecciona. */
  entryNumber?: number
  retention: RetentionStatus
}

const OPEN_STATUSES = new Set(['activo', 'suspendido', 'trabajo_terminado'])

function evaluate(
  caseData: Case,
  entry: RegistryEntry | undefined,
  contractIds: Set<string>
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = []
  const open = OPEN_STATUSES.has(caseData.status)

  if (!caseData.legitimateInterest?.trim()) {
    issues.push({
      severity: 'red',
      label: 'Sin interés legítimo acreditado',
      detail:
        'El art. 48.2 de la Ley 5/2014 exige acreditar el interés legítimo de quien contrata antes de investigar.',
    })
  } else if (!caseData.legitimateInterestValidated) {
    issues.push({
      severity: 'amber',
      label: 'Interés legítimo sin validar',
      detail: 'Está escrito pero nadie del despacho lo ha dado por bueno.',
    })
  }

  if (!caseData.investigatedName?.trim()) {
    issues.push({
      severity: 'red',
      label: 'Investigado sin identificar',
      detail:
        'El Anexo VII de la Orden INT/318/2011 exige la identidad del investigado en el asiento del libro.',
    })
  }

  if (!caseData.assignedDetectiveTip?.trim()) {
    issues.push({
      severity: 'red',
      label: 'Sin TIP del detective actuante',
      detail:
        'Toda investigación la firma un detective habilitado, y su TIP consta en el libro y en el informe.',
    })
  }

  if (!contractIds.has(caseData.id)) {
    issues.push({
      severity: 'red',
      label: 'Sin contrato firmado',
      detail:
        'No consta contrato firmado para este expediente. El encargo tiene que estar contratado por escrito.',
    })
  }

  if (!entry) {
    issues.push({
      severity: 'red',
      label: 'No consta en el libro-registro',
      detail:
        'Todo servicio de investigación se anota en el libro (art. 108 del Reglamento de Seguridad Privada).',
    })
  } else if (!entry.clientTaxId?.trim() || !entry.clientAddress?.trim()) {
    issues.push({
      severity: 'amber',
      label: 'Asiento incompleto',
      detail: `Al asiento nº ${entry.entryNumber} le faltan datos del contratante que pide el Anexo VII.`,
    })
  }

  if (!open && !caseData.closedAt) {
    issues.push({
      severity: 'amber',
      label: 'Cierre sin fecha',
      detail:
        'El expediente figura terminado pero no consta cuándo, y de esa fecha depende el plazo de conservación.',
    })
  }

  const retention = retentionStatus(caseData)
  if (retention.state === 'vencido') {
    issues.push({
      severity: 'red',
      label: 'Material gráfico por destruir',
      detail:
        'Han pasado tres años desde que terminó la investigación. El art. 49.4 de la Ley 5/2014 obliga a destruir las imágenes y sonidos grabados.',
    })
  } else if (retention.state === 'proximo') {
    issues.push({
      severity: 'amber',
      label: 'Destrucción próxima',
      detail: `Quedan ${retention.daysLeft} días para destruir las imágenes y sonidos de este asunto.`,
    })
  }

  return issues
}

export async function getFirmComplianceAlerts(firmId: string): Promise<ComplianceAlert[]> {
  const [cases, entries, contractsSnap] = await Promise.all([
    getCases(firmId),
    getRegistryEntries(firmId),
    getDocs(collection(db, 'firms', firmId, 'contracts')),
  ])

  const entryByCase = new Map(entries.filter((e) => e.caseId).map((e) => [e.caseId, e]))
  const signedCaseIds = new Set(
    contractsSnap.docs
      .map((d) => d.data() as Record<string, unknown>)
      .filter((c) => c.status === 'firmado' && typeof c.caseId === 'string')
      .map((c) => c.caseId as string)
  )

  return cases
    .map((caseData) => {
      const entry = entryByCase.get(caseData.id)
      const issues = evaluate(caseData, entry, signedCaseIds)
      const status: ComplianceStatus = issues.some((i) => i.severity === 'red')
        ? 'red'
        : issues.length > 0
          ? 'amber'
          : 'green'

      return {
        caseId: caseData.id,
        caseNumber: caseData.caseNumber,
        investigationType: caseData.investigationTypeCustom || caseData.investigationType,
        status,
        issues,
        entryNumber: entry?.entryNumber,
        retention: retentionStatus(caseData),
      }
    })
    .filter((a) => a.issues.length > 0)
    .sort((a, b) => {
      const order: Record<ComplianceStatus, number> = { red: 0, amber: 1, green: 2 }
      return order[a.status] - order[b.status] || a.caseNumber.localeCompare(b.caseNumber)
    })
}

/** Asuntos cuyo material gráfico está pendiente de destruir o retenido. */
export interface RetentionRow {
  caseId: string
  caseNumber: string
  entryNumber?: number
  clientName: string
  location: string
  retention: RetentionStatus
  exceptionReason?: string
}

export async function getRetentionQueue(firmId: string): Promise<RetentionRow[]> {
  const [cases, entries] = await Promise.all([
    getCases(firmId),
    getRegistryEntries(firmId),
  ])
  const entryByCase = new Map(entries.filter((e) => e.caseId).map((e) => [e.caseId, e]))

  return cases
    .map((c) => {
      const entry = entryByCase.get(c.id)
      return {
        caseId: c.id,
        caseNumber: c.caseNumber,
        entryNumber: entry?.entryNumber,
        clientName: entry?.clientName ?? '',
        location: c.graphicMaterialLocation ?? '',
        retention: retentionStatus(c),
        exceptionReason: c.exceptionReason,
      }
    })
    .filter((r) =>
      ['vencido', 'proximo', 'retenido', 'conservando'].includes(r.retention.state)
    )
    .sort((a, b) => {
      const order = ['vencido', 'proximo', 'retenido', 'conservando']
      return (
        order.indexOf(a.retention.state) - order.indexOf(b.retention.state) ||
        (a.retention.daysLeft ?? 0) - (b.retention.daysLeft ?? 0)
      )
    })
}

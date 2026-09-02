import { getRegistryEntry, getRegistryEntryByNumber } from './registry'
import { getCase } from './cases'
import { getContractsByCase } from './contracts'
import { getQuote } from './quotes'
import { getCaseReport } from './reports'
import { getCaseActions } from './actions'
import { getClient } from './clients'
import type { Contract } from './contracts'
import type { Report } from './reports'
import type { RegistryEntry, Case, Client, CaseAction, Quote } from '@/types'

// Cuando la Policía Nacional inspecciona un despacho no pide "el módulo de
// contratos": señala una línea del libro y dice «dame todo lo relacionado
// con el asiento 124». Hasta ahora eso obligaba a recorrer cinco pantallas
// distintas. Este servicio reúne de una vez todo lo que cuelga de un
// asiento — el expediente en el sentido en que lo entiende un detective:
// la carpeta del asunto.
export interface Dossier {
  entry: RegistryEntry
  caseData: Case | null
  client: Client | null
  quote: Quote | null
  contracts: Contract[]
  report: Report | null
  actions: CaseAction[]
}

async function assemble(entry: RegistryEntry): Promise<Dossier> {
  const caseData = entry.caseId ? await getCase(entry.firmId, entry.caseId) : null

  // El resto cuelga del expediente, así que en paralelo. Un asiento
  // histórico (importado del libro de papel) no tiene expediente: se
  // devuelve solo, y la pantalla lo dirá en vez de fingir que falta todo.
  const [contracts, report, actions, quote, client] = await Promise.all([
    caseData ? getContractsByCase(entry.firmId, caseData.id) : Promise.resolve([]),
    caseData ? getCaseReport(entry.firmId, caseData.id) : Promise.resolve(null),
    caseData ? getCaseActions(entry.firmId, caseData.id) : Promise.resolve([]),
    caseData?.quoteId ? getQuote(entry.firmId, caseData.quoteId) : Promise.resolve(null),
    caseData?.clientId ? getClient(entry.firmId, caseData.clientId) : Promise.resolve(null),
  ])

  return { entry, caseData, client, quote, contracts, report, actions }
}

export async function getDossier(firmId: string, entryId: string): Promise<Dossier | null> {
  const entry = await getRegistryEntry(firmId, entryId)
  if (!entry) return null
  return assemble(entry)
}

export async function getDossierByEntryNumber(
  firmId: string,
  entryNumber: number
): Promise<Dossier | null> {
  const entry = await getRegistryEntryByNumber(firmId, entryNumber)
  if (!entry) return null
  return assemble(entry)
}

// Lo que le faltaría al asiento si mañana entrase una inspección. No es la
// validación de cumplimiento general del despacho: es la de esta carpeta
// concreta, y por eso habla del asiento, no del expediente.
export type DossierGapSeverity = 'critical' | 'warning'

export interface DossierGap {
  severity: DossierGapSeverity
  label: string
  detail: string
}

export function dossierGaps(dossier: Dossier): DossierGap[] {
  const gaps: DossierGap[] = []
  const { entry, caseData, contracts, report } = dossier

  // Los asientos importados del papel se anotaron en su día con lo que
  // pedía el libro; exigirles contrato o informe digital sería marcar como
  // incompleto todo el histórico del despacho.
  if (entry.origin === 'historico') {
    if (!entry.physicalLocation) {
      gaps.push({
        severity: 'warning',
        label: 'Sin ubicación física',
        detail: 'No consta dónde está la carpeta en papel de este asunto.',
      })
    }
    return gaps
  }

  // Anexo VII de la Orden INT/318/2011: columnas que el asiento debe llevar.
  const anexoVii: Array<[string, string]> = [
    [entry.clientName, 'nombre del contratante'],
    [entry.clientTaxId, 'NIF/CIF del contratante'],
    [entry.clientAddress, 'domicilio del contratante'],
    [entry.investigationObject, 'objeto de la investigación'],
    [entry.investigatedName, 'identidad del investigado'],
    [entry.detectiveTip, 'TIP del detective actuante'],
  ]
  const missing = anexoVii.filter(([value]) => !value?.trim()).map(([, name]) => name)
  if (missing.length > 0) {
    gaps.push({
      severity: 'critical',
      label: 'Faltan datos del Anexo VII',
      detail: `El asiento no tiene ${missing.join(', ')}.`,
    })
  }

  const signed = contracts.filter((c) => c.status === 'firmado')
  if (signed.length === 0) {
    gaps.push({
      severity: 'critical',
      label: 'Sin contrato firmado',
      detail:
        contracts.length > 0
          ? 'Hay contrato, pero ninguno consta firmado.'
          : 'No hay ningún contrato asociado a este asiento.',
    })
  }

  if (!report) {
    // Un asunto todavía abierto puede no tener informe: se está trabajando.
    gaps.push({
      severity: entry.status === 'cerrado' ? 'critical' : 'warning',
      label: 'Sin informe',
      detail:
        entry.status === 'cerrado'
          ? 'El asunto está cerrado y no hay informe de investigación.'
          : 'Todavía no se ha redactado el informe.',
    })
  } else if (report.status !== 'entregado' && entry.status === 'cerrado') {
    gaps.push({
      severity: 'warning',
      label: 'Informe sin entregar',
      detail: 'El asunto está cerrado pero el informe no consta entregado al cliente.',
    })
  }

  if (caseData && !caseData.legitimateInterest?.trim()) {
    gaps.push({
      severity: 'critical',
      label: 'Sin interés legítimo',
      detail:
        'El art. 48.2 de la Ley 5/2014 exige acreditar el interés legítimo de quien contrata.',
    })
  }

  return gaps
}

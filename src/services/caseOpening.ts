import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getContract, setContractCase } from '@/services/contracts'
import { getQuote, setQuoteCase } from '@/services/quotes'
import { createCase, getCase } from '@/services/cases'
import { getFirm } from '@/services/firm'
import { getClient } from '@/services/clients'
import { createRegistryEntry } from '@/services/registry'
import { updateDoc, serverTimestamp } from 'firebase/firestore'
import type { ComplianceStatus, ClientAddress } from '@/types'

function formatClientAddress(address: ClientAddress | undefined): string {
  if (!address) return ''
  return `${address.street}, ${address.postalCode} ${address.city} (${address.province})`
}

// Punto único donde se abre un expediente a partir de un contrato ya
// firmado — nunca antes (ver PROJECT_DESCRIPTION.md, cambio de flujo
// del 2026-09-01: Presupuesto → Contrato → [firmado] → Expediente).
// Se llama tanto tras una firma manual (staff, inmediata) como desde
// el botón "Abrir expediente" que ve el despacho cuando el contrato se
// firmó por el enlace público (ahí no se puede abrir el expediente
// automáticamente: el firmante no está autenticado como miembro del
// despacho, así que las reglas de Firestore no lo permitirían).
export async function openCaseFromContract(
  firmId: string,
  userId: string,
  contractId: string
): Promise<string> {
  const contract = await getContract(firmId, contractId)
  if (!contract) throw new Error('Contrato no encontrado.')
  if (contract.status !== 'firmado') throw new Error('El contrato todavía no está firmado.')
  if (contract.caseId) return contract.caseId // ya se abrió — idempotente

  if (!contract.quoteId) {
    throw new Error('Este contrato no viene de un presupuesto, no se puede abrir un expediente automáticamente.')
  }
  const quote = await getQuote(firmId, contract.quoteId)
  if (!quote) throw new Error('El presupuesto de este contrato ya no existe.')
  if (!quote.objectScope || !quote.investigatedName) {
    throw new Error('Al presupuesto le faltan datos legales del expediente (objeto, investigado).')
  }

  const caseId = await createCase(firmId, userId, {
    investigationType: quote.investigationType,
    investigationTypeCustom: quote.investigationTypeCustom,
    description: quote.description,
    objectScope: quote.objectScope,
    legitimateInterest: quote.legitimateInterest ?? '',
    investigatedName: quote.investigatedName,
    investigatedAddress: quote.investigatedAddress ?? '',
    assignedDetectiveId: quote.assignedDetectiveId || userId,
    assignedDetectiveTip: quote.assignedDetectiveTip ?? '',
    quoteId: quote.id,
    clientId: contract.clientId,
    billingMode: 'quote',
  })

  await Promise.all([
    setQuoteCase(firmId, quote.id, caseId),
    setContractCase(firmId, contractId, caseId),
  ])

  // Libro-registro + activar el expediente — misma lógica que antes vivía
  // en CaseContractTab al firmar dentro de un expediente ya abierto.
  const [caseData, firm, client] = await Promise.all([
    getCase(firmId, caseId),
    getFirm(firmId),
    contract.clientId ? getClient(firmId, contract.clientId) : Promise.resolve(null),
  ])
  if (!caseData) throw new Error('No se pudo recuperar el expediente recién creado.')

  const memberDoc = await getDoc(
    doc(db, 'firms', firmId, 'members', quote.assignedDetectiveId || userId)
  )
  const memberData = memberDoc.exists() ? memberDoc.data() : null

  const entryId = await createRegistryEntry(firmId, userId, {
    firmRnsp: firm?.rnsp ?? '',
    clientName: client?.legalName ?? contract.clientName,
    clientTaxId: client?.taxId ?? '',
    clientType: client?.clientType ?? 'individual',
    clientAddress: formatClientAddress(client?.address),
    investigationObject: quote.objectScope || quote.description,
    investigatedName: quote.investigatedName,
    investigatedAddress: quote.investigatedAddress ?? '',
    detectiveName: (memberData?.displayName as string) ?? '',
    detectiveTip: (memberData?.tipNumber as string) ?? quote.assignedDetectiveTip ?? '',
    caseId,
    caseNumber: caseData.caseNumber,
  })

  await updateDoc(doc(db, 'firms', firmId, 'cases', caseId), {
    status: 'activo',
    registryEntryId: entryId,
    // Quien acepta el presupuesto escribe el interés legítimo ahí mismo,
    // en el mismo paso — no hay una persona distinta que lo revise después
    // (ver AcceptQuoteDialog, paso "legal"). Dejarlo en false para
    // siempre, esperando una validación que nunca llega, solo generaba un
    // aviso ámbar permanente en Cumplimiento.
    legitimateInterestValidated: true,
    complianceStatus: 'green' as ComplianceStatus,
    complianceIssues: [],
    updatedAt: serverTimestamp(),
  })

  return caseId
}

export interface FrameworkCaseData {
  investigationType: string
  description: string
  objectScope: string
  legitimateInterest: string
  investigatedName: string
  investigatedAddress: string
  agreedAmount?: number
  clientId: string
}

// Un expediente de contrato marco no pasa por presupuesto: el propio marco
// ya es la autorización del cliente para investigar dentro de sus
// condiciones. Antes esto se creaba con `services/cases.ts` a secas y se
// quedaba parado en 'revision' para siempre —sin asiento en el libro,
// porque createRegistryEntry solo se llamaba desde aquí— así que ningún
// expediente de contrato marco llegaba nunca al libro-registro pese a ser
// exactamente el tipo de servicio que el art. 108 obliga a anotar. Este es
// el mismo camino que sigue un expediente nacido de un presupuesto,
// adaptado a que aquí no hay presupuesto ni contrato individual que abrir.
export async function openFrameworkCase(
  firmId: string,
  userId: string,
  data: FrameworkCaseData
): Promise<string> {
  const [firm, client, memberDoc] = await Promise.all([
    getFirm(firmId),
    getClient(firmId, data.clientId),
    getDoc(doc(db, 'firms', firmId, 'members', userId)),
  ])
  const memberData = memberDoc.exists() ? memberDoc.data() : null

  const caseId = await createCase(firmId, userId, {
    investigationType: data.investigationType,
    description: data.description,
    objectScope: data.objectScope,
    legitimateInterest: data.legitimateInterest,
    investigatedName: data.investigatedName,
    investigatedAddress: data.investigatedAddress,
    assignedDetectiveId: userId,
    assignedDetectiveTip: (memberData?.tipNumber as string) ?? '',
    clientId: data.clientId,
    billingMode: 'framework',
    agreedAmount: data.agreedAmount,
  })

  const caseData = await getCase(firmId, caseId)
  if (!caseData) throw new Error('No se pudo recuperar el expediente recién creado.')

  const entryId = await createRegistryEntry(firmId, userId, {
    firmRnsp: firm?.rnsp ?? '',
    clientName: client?.legalName ?? '',
    clientTaxId: client?.taxId ?? '',
    clientType: client?.clientType ?? 'individual',
    clientAddress: formatClientAddress(client?.address),
    investigationObject: data.objectScope || data.description,
    investigatedName: data.investigatedName,
    investigatedAddress: data.investigatedAddress ?? '',
    detectiveName: (memberData?.displayName as string) ?? '',
    detectiveTip: (memberData?.tipNumber as string) ?? '',
    caseId,
    caseNumber: caseData.caseNumber,
  })

  await updateDoc(doc(db, 'firms', firmId, 'cases', caseId), {
    status: 'activo',
    registryEntryId: entryId,
    // El interés legítimo lo escribe aquí mismo quien abre el expediente,
    // no queda pendiente de que otro lo revise después — a diferencia del
    // camino por presupuesto, aquí no hay un segundo momento en el que
    // validarlo.
    legitimateInterestValidated: true,
    complianceStatus: 'green' as ComplianceStatus,
    complianceIssues: [],
    updatedAt: serverTimestamp(),
  })

  return caseId
}

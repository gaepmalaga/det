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
    complianceStatus: 'green' as ComplianceStatus,
    complianceIssues: [],
    updatedAt: serverTimestamp(),
  })

  return caseId
}

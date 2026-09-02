import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

export type ContractType =
  | 'servicio_cliente'
  | 'marco_colaboracion'
  | 'marco_corporativo'

export type ContractStatus =
  | 'borrador'
  | 'enviado'
  | 'firmado'
  | 'rescindido'

export interface Contract {
  id: string
  firmId: string
  contractNumber: string
  contractNumberInt: number
  type: ContractType
  status: ContractStatus
  caseId?: string
  quoteId?: string
  clientId?: string
  collaboratorId?: string
  clientName: string
  issuedAt: Date
  signedAt?: Date
  signedByName?: string
  signedIp?: string
  // Garabato dibujado a mano (ratón o táctil) en el momento de firmar,
  // como imagen PNG en base64 — guardado directamente en el documento
  // (en vez de Storage) porque quien firma por enlace público no está
  // autenticado y Storage exige `request.auth != null` para escribir;
  // las reglas de Firestore para `contracts` ya permiten esa firma
  // pública tocando solo los campos concretos de la firma.
  signatureDataUrl?: string
  serviceDescription: string
  agreedPrice?: string
  specificConditions?: string
  bodyText?: string
  // PDF redactado fuera de la plataforma y subido como base del contrato
  // que verá y firmará el cliente, en vez del texto generado desde la
  // plantilla del despacho.
  sourceDocumentUrl?: string
  sourceDocumentName?: string
  scannedDocumentUrl?: string
  scannedDocumentName?: string
  createdAt: Date
  createdBy: string
  updatedAt: Date
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

function mapContract(id: string, data: Record<string, unknown>): Contract {
  return {
    id,
    firmId: data.firmId as string,
    contractNumber: data.contractNumber as string,
    contractNumberInt: data.contractNumberInt as number,
    type: data.type as ContractType,
    status: data.status as ContractStatus,
    caseId: data.caseId as string | undefined,
    quoteId: data.quoteId as string | undefined,
    clientId: data.clientId as string | undefined,
    collaboratorId: data.collaboratorId as string | undefined,
    clientName: data.clientName as string,
    issuedAt: toDate(data.issuedAt),
    signedAt: toDateOrUndefined(data.signedAt),
    signedByName: data.signedByName as string | undefined,
    signedIp: data.signedIp as string | undefined,
    signatureDataUrl: data.signatureDataUrl as string | undefined,
    serviceDescription: data.serviceDescription as string,
    agreedPrice: data.agreedPrice as string | undefined,
    specificConditions: data.specificConditions as string | undefined,
    bodyText: data.bodyText as string | undefined,
    sourceDocumentUrl: data.sourceDocumentUrl as string | undefined,
    sourceDocumentName: data.sourceDocumentName as string | undefined,
    scannedDocumentUrl: data.scannedDocumentUrl as string | undefined,
    scannedDocumentName: data.scannedDocumentName as string | undefined,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getContracts(firmId: string): Promise<Contract[]> {
  const ref = collection(db, 'firms', firmId, 'contracts')
  const q = query(ref, orderBy('contractNumberInt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapContract(d.id, d.data() as Record<string, unknown>))
}

export async function getContractsByCase(firmId: string, caseId: string): Promise<Contract[]> {
  const ref = collection(db, 'firms', firmId, 'contracts')
  const q = query(ref, where('caseId', '==', caseId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapContract(d.id, d.data() as Record<string, unknown>))
}

export async function getContractsByCollaborator(
  firmId: string,
  collaboratorId: string
): Promise<Contract[]> {
  const ref = collection(db, 'firms', firmId, 'contracts')
  const q = query(ref, where('collaboratorId', '==', collaboratorId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapContract(d.id, d.data() as Record<string, unknown>))
}

export async function getContract(firmId: string, contractId: string): Promise<Contract | null> {
  const ref = doc(db, 'firms', firmId, 'contracts', contractId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapContract(snap.id, snap.data() as Record<string, unknown>)
}

export interface CreateContractData {
  type: ContractType
  caseId?: string
  quoteId?: string
  clientId?: string
  collaboratorId?: string
  clientName: string
  serviceDescription: string
  agreedPrice?: string
  specificConditions?: string
  bodyText?: string
}

export async function createContract(
  firmId: string,
  userId: string,
  data: CreateContractData
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'contracts')
  const countSnap = await getDocs(ref)
  const count = countSnap.size + 1
  const contractNumber = `CONT-${String(count).padStart(4, '0')}`

  const cleanData: Record<string, unknown> = {
    firmId,
    contractNumber,
    contractNumberInt: count,
    type: data.type,
    status: 'borrador' as ContractStatus,
    clientName: data.clientName,
    serviceDescription: data.serviceDescription,
    issuedAt: serverTimestamp(),
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.caseId) cleanData.caseId = data.caseId
  if (data.quoteId) cleanData.quoteId = data.quoteId
  if (data.clientId) cleanData.clientId = data.clientId
  if (data.collaboratorId) cleanData.collaboratorId = data.collaboratorId
  if (data.agreedPrice) cleanData.agreedPrice = data.agreedPrice
  if (data.specificConditions) cleanData.specificConditions = data.specificConditions
  if (data.bodyText) cleanData.bodyText = data.bodyText

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

// ─── FIRMA POR LINK (cliente, sin autenticar) ─────────────────────────────────

export async function getContractForSigning(
  firmId: string,
  contractId: string
): Promise<Contract | null> {
  const ref = doc(db, 'firms', firmId, 'contracts', contractId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapContract(snap.id, snap.data() as Record<string, unknown>)
}

export async function signContractPublicly(
  firmId: string,
  contractId: string,
  signedByName: string,
  signedIp: string | null,
  signatureDataUrl?: string | null
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'contracts', contractId)
  const updateData: Record<string, unknown> = {
    status: 'firmado' as ContractStatus,
    signedAt: serverTimestamp(),
    signedByName,
  }
  if (signedIp) updateData.signedIp = signedIp
  if (signatureDataUrl) updateData.signatureDataUrl = signatureDataUrl
  await updateDoc(ref, updateData)
}

export async function markContractAsSigned(
  firmId: string,
  contractId: string,
  signedByName: string,
  signatureDataUrl?: string | null
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'contracts', contractId)
  const updateData: Record<string, unknown> = {
    status: 'firmado' as ContractStatus,
    signedAt: serverTimestamp(),
    signedByName,
    updatedAt: serverTimestamp(),
  }
  if (signatureDataUrl) updateData.signatureDataUrl = signatureDataUrl
  await updateDoc(ref, updateData)
}

export async function setContractCase(
  firmId: string,
  contractId: string,
  caseId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'contracts', contractId)
  await updateDoc(ref, { caseId, updatedAt: serverTimestamp() })
}

export async function updateContractStatus(
  firmId: string,
  contractId: string,
  status: ContractStatus
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'contracts', contractId)
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function uploadContractSourceDocument(
  firmId: string,
  contractId: string,
  file: File
): Promise<string> {
  const storageRef = ref(
    storage,
    `firms/${firmId}/contracts/${contractId}/source-${file.name}`
  )
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  const docRef = doc(db, 'firms', firmId, 'contracts', contractId)
  await updateDoc(docRef, {
    sourceDocumentUrl: url,
    sourceDocumentName: file.name,
    updatedAt: serverTimestamp(),
  })

  return url
}

export async function uploadContractDocument(
  firmId: string,
  contractId: string,
  file: File
): Promise<string> {
  const storageRef = ref(
    storage,
    `firms/${firmId}/contracts/${contractId}/${file.name}`
  )
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  const docRef = doc(db, 'firms', firmId, 'contracts', contractId)
  await updateDoc(docRef, {
    scannedDocumentUrl: url,
    scannedDocumentName: file.name,
    updatedAt: serverTimestamp(),
  })

  return url
}

export async function updateContract(
  firmId: string,
  contractId: string,
  data: Partial<CreateContractData>
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'contracts', contractId)
  const cleanData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }
  if (data.serviceDescription !== undefined) cleanData.serviceDescription = data.serviceDescription
  if (data.agreedPrice) cleanData.agreedPrice = data.agreedPrice
  if (data.specificConditions) cleanData.specificConditions = data.specificConditions
  if (data.clientName !== undefined) cleanData.clientName = data.clientName
  await updateDoc(ref, cleanData)
}
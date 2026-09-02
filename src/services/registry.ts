import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { nextSequenceNumber } from './counters'
import type {
  RegistryEntry,
  RegistryEntryStatus,
  RegistryEntryOrigin,
  ContactType,
} from '@/types'

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

function mapEntry(id: string, data: Record<string, unknown>): RegistryEntry {
  const amendments = Array.isArray(data.amendments)
    ? (data.amendments as Record<string, unknown>[]).map((a) => ({
        amendedAt: toDate(a.amendedAt),
        amendedBy: a.amendedBy as string,
        field: a.field as string,
        oldValue: a.oldValue as string,
        newValue: a.newValue as string,
        reason: a.reason as string,
      }))
    : []

  return {
    id,
    firmId: data.firmId as string,
    entryNumber: data.entryNumber as number,
    entryDate: toDate(data.entryDate),
    firmRnsp: data.firmRnsp as string,
    branchId: data.branchId as string | undefined,
    // Los asientos creados antes de existir este campo son todos de la
    // plataforma: los históricos solo pueden entrar por importación.
    origin: (data.origin as RegistryEntryOrigin) ?? 'plataforma',
    physicalLocation: data.physicalLocation as string | undefined,
    clientName: data.clientName as string,
    clientTaxId: (data.clientTaxId as string) ?? '',
    clientType: data.clientType as ContactType,
    clientAddress: (data.clientAddress as string) ?? '',
    investigationObject: data.investigationObject as string,
    investigatedName: (data.investigatedName as string) ?? '',
    investigatedAddress: (data.investigatedAddress as string) ?? '',
    knownOffenses: (data.knownOffenses as string) ?? '',
    offensesReportedTo: (data.offensesReportedTo as string) ?? '',
    detectiveName: data.detectiveName as string,
    detectiveTip: data.detectiveTip as string,
    startDate: toDate(data.startDate),
    endDate: toDateOrUndefined(data.endDate),
    caseId: data.caseId as string,
    caseNumber: data.caseNumber as string,
    reportId: data.reportId as string | undefined,
    status: data.status as RegistryEntryStatus,
    amendments,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy as string,
  }
}

export interface CreateRegistryEntryData {
  firmRnsp: string
  clientName: string
  clientTaxId: string
  clientType: ContactType
  clientAddress: string
  investigationObject: string
  investigatedName: string
  investigatedAddress: string
  detectiveName: string
  detectiveTip: string
  caseId: string
  caseNumber: string
}

export async function getRegistryEntries(firmId: string): Promise<RegistryEntry[]> {
  const ref = collection(db, 'firms', firmId, 'registryBooks')
  const q = query(ref, orderBy('entryNumber', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapEntry(d.id, d.data() as Record<string, unknown>))
}

export async function getRegistryEntry(
  firmId: string,
  entryId: string
): Promise<RegistryEntry | null> {
  const snap = await getDoc(doc(db, 'firms', firmId, 'registryBooks', entryId))
  if (!snap.exists()) return null
  return mapEntry(snap.id, snap.data() as Record<string, unknown>)
}

// Un inspector no pregunta por el ID interno del asiento, pregunta por el
// número: «dame todo lo del asiento 124».
export async function getRegistryEntryByNumber(
  firmId: string,
  entryNumber: number
): Promise<RegistryEntry | null> {
  const ref = collection(db, 'firms', firmId, 'registryBooks')
  const snap = await getDocs(query(ref, where('entryNumber', '==', entryNumber)))
  if (snap.empty) return null
  const d = snap.docs[0]
  return mapEntry(d.id, d.data() as Record<string, unknown>)
}

export async function createRegistryEntry(
  firmId: string,
  userId: string,
  data: CreateRegistryEntryData,
  // Número por el que arranca el libro si es el primer asiento del
  // despacho. Solo cuenta la primera vez: a partir de ahí manda el
  // contador (Configuración → Libro-registro).
  registryStartNumber = 1
): Promise<string> {
  const ref = collection(db, 'firms', firmId, 'registryBooks')
  // Número correlativo atómico: no se repite aunque dos personas creen a
  // la vez, y no retrocede aunque se borre un asiento (ver counters.ts).
  const count = await nextSequenceNumber(firmId, 'registry', registryStartNumber)

  const cleanData: Record<string, unknown> = {
    firmId,
    entryNumber: count,
    origin: 'plataforma' as RegistryEntryOrigin,
    entryDate: serverTimestamp(),
    firmRnsp: data.firmRnsp,
    clientName: data.clientName,
    clientTaxId: data.clientTaxId,
    clientType: data.clientType,
    clientAddress: data.clientAddress,
    investigationObject: data.investigationObject,
    investigatedName: data.investigatedName,
    investigatedAddress: data.investigatedAddress,
    knownOffenses: '',
    offensesReportedTo: '',
    detectiveName: data.detectiveName,
    detectiveTip: data.detectiveTip,
    startDate: serverTimestamp(),
    caseId: data.caseId,
    caseNumber: data.caseNumber,
    status: 'abierto' as RegistryEntryStatus,
    amendments: [],
    createdBy: userId,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(ref, cleanData)
  return docRef.id
}

export async function closeRegistryEntry(
  firmId: string,
  entryId: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'registryBooks', entryId)
  await updateDoc(ref, {
    status: 'cerrado' as RegistryEntryStatus,
    endDate: serverTimestamp(),
  })
}

// Marca hasta qué nº de asiento se ha impreso ya en papel, para que la
// próxima exportación "solo lo nuevo" no repita folios ya completados.
export async function setRegistryLastPrinted(
  firmId: string,
  entryNumber: number
): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  await updateDoc(ref, {
    registryLastPrintedEntry: entryNumber,
    registryLastPrintedAt: serverTimestamp(),
  })
}

/**
 * Reordena la numeración del libro por fecha de inicio, de la más antigua
 * a la más reciente, empezando en 1.
 *
 * Hace falta cuando el libro ha quedado contando la historia al revés —
 * típicamente al traerse el histórico de papel con números por encima de
 * los que la plataforma ya había gastado—. Un libro-registro se numera por
 * orden de encargo, y un inspector mira precisamente eso.
 *
 * Solo se puede hacer sobre un libro que todavía no se ha impreso: en
 * cuanto un folio está sobre una hoja sellada, el número que lleva es el
 * que es, y cambiarlo aquí solo conseguiría que el papel y la plataforma
 * dejaran de coincidir.
 */
export async function renumberRegistryChronologically(
  firmId: string
): Promise<{ renumbered: number; nextNumber: number }> {
  const firmSnap = await getDoc(doc(db, 'firms', firmId))
  const printed =
    ((firmSnap.data()?.registryBook as Record<string, unknown>)
      ?.printedFolios as number[]) ?? []
  if (printed.length > 0) {
    throw new Error(
      `Ya hay folios impresos (${printed.join(', ')}). Cambiar ahora la numeración dejaría el papel y la plataforma diciendo cosas distintas.`
    )
  }

  const entries = await getRegistryEntries(firmId)
  const ordered = [...entries].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  )

  const batch = writeBatch(db)
  let changed = 0

  ordered.forEach((entry, i) => {
    const number = i + 1
    if (entry.entryNumber === number) return
    changed += 1
    batch.update(doc(db, 'firms', firmId, 'registryBooks', entry.id), {
      entryNumber: number,
    })
    // El expediente guarda el nº de asiento para enseñarlo sin releer el
    // libro; si no se actualiza aquí, se queda mintiendo.
    if (entry.caseId) {
      batch.update(doc(db, 'firms', firmId, 'cases', entry.caseId), {
        registryEntryNumber: number,
      })
    }
  })

  await batch.commit()
  return { renumbered: changed, nextNumber: ordered.length + 1 }
}

export async function amendRegistryEntry(
  firmId: string,
  entryId: string,
  userId: string,
  field: string,
  oldValue: string,
  newValue: string,
  reason: string
): Promise<void> {
  const ref = doc(db, 'firms', firmId, 'registryBooks', entryId)
  const amendment = {
    amendedAt: Timestamp.now(),
    amendedBy: userId,
    field,
    oldValue,
    newValue,
    reason,
  }
  await updateDoc(ref, {
    [field]: newValue,
    amendments: arrayUnion(amendment),
  })
}
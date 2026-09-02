import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { RegistryEntry } from '@/types'

// El libro-registro puede llevarse en soporte informático, pero para valer
// como libro tiene que acabar impreso sobre hojas numeradas y selladas, con
// la diligencia de habilitación de la unidad policial en la primera. Eso
// impone una condición que un listado corrido no cumple: cada asiento tiene
// que caer siempre en el mismo folio, y un folio ya impreso no se puede
// volver a imprimir — la hoja sellada es única.
//
// De ahí sale toda la aritmética de este fichero: el libro es una rejilla
// de folios de N filas, no una lista que fluye.

export interface RegistryDiligence {
  /** Fecha de la diligencia de habilitación. */
  date: Date
  /** Unidad policial que habilitó el libro. */
  authority: string
  /** Referencia o número de la diligencia. */
  reference: string
  /** Folios que la diligencia habilita. */
  foliosAuthorized: number
}

export interface RegistryBookConfig {
  /** Asientos que caben en cada folio del libro físico. */
  rowsPerFolio: number
  /** Número del folio donde empieza el libro. */
  firstFolio: number
  /** Número del asiento que abre ese primer folio. */
  firstEntry: number
  diligence?: RegistryDiligence
  /** Folios ya impresos sobre hoja sellada. No se reimprimen. */
  printedFolios: number[]
}

export const DEFAULT_CONFIG: RegistryBookConfig = {
  rowsPerFolio: 10,
  firstFolio: 1,
  firstEntry: 1,
  printedFolios: [],
}

export function folioOf(entryNumber: number, config: RegistryBookConfig): number {
  const offset = entryNumber - config.firstEntry
  return config.firstFolio + Math.floor(offset / config.rowsPerFolio)
}

/** Primer y último número de asiento que corresponden a un folio. */
export function folioRange(folio: number, config: RegistryBookConfig): [number, number] {
  const first = config.firstEntry + (folio - config.firstFolio) * config.rowsPerFolio
  return [first, first + config.rowsPerFolio - 1]
}

export type FolioState = 'impreso' | 'completo' | 'incompleto'

export interface Folio {
  number: number
  entries: RegistryEntry[]
  /** Huecos que quedan por rellenar antes de que el folio esté completo. */
  free: number
  state: FolioState
}

export function buildFolios(
  entries: RegistryEntry[],
  config: RegistryBookConfig
): Folio[] {
  const printed = new Set(config.printedFolios)
  const byFolio = new Map<number, RegistryEntry[]>()

  entries.forEach((e) => {
    // Un asiento anterior al arranque configurado del libro no cae en
    // ningún folio: es un asiento del libro viejo, no de este.
    if (e.entryNumber < config.firstEntry) return
    const f = folioOf(e.entryNumber, config)
    const list = byFolio.get(f)
    if (list) list.push(e)
    else byFolio.set(f, [e])
  })

  return [...byFolio.entries()]
    .map(([number, list]) => {
      const sorted = [...list].sort((a, b) => a.entryNumber - b.entryNumber)
      const free = config.rowsPerFolio - sorted.length
      return {
        number,
        entries: sorted,
        free,
        state: printed.has(number)
          ? ('impreso' as const)
          : free === 0
            ? ('completo' as const)
            : ('incompleto' as const),
      }
    })
    .sort((a, b) => a.number - b.number)
}

// Un folio a medias no debería imprimirse todavía: la hoja sellada es
// única, así que los asientos que faltan por anotar ya no cabrían en ella
// y habría que dar el folio por perdido.
export function foliosReadyToPrint(folios: Folio[]): Folio[] {
  return folios.filter((f) => f.state === 'completo')
}

// ─── Persistencia ──────────────────────────────────────────────────────

function mapConfig(data: Record<string, unknown> | undefined): RegistryBookConfig {
  const raw = (data?.registryBook as Record<string, unknown>) ?? {}
  const dil = raw.diligence as Record<string, unknown> | undefined

  return {
    rowsPerFolio: (raw.rowsPerFolio as number) || DEFAULT_CONFIG.rowsPerFolio,
    firstFolio: (raw.firstFolio as number) || DEFAULT_CONFIG.firstFolio,
    firstEntry: (raw.firstEntry as number) || DEFAULT_CONFIG.firstEntry,
    printedFolios: (raw.printedFolios as number[]) ?? [],
    diligence: dil
      ? {
          date:
            dil.date instanceof Timestamp
              ? dil.date.toDate()
              : new Date(dil.date as string),
          authority: (dil.authority as string) ?? '',
          reference: (dil.reference as string) ?? '',
          foliosAuthorized: (dil.foliosAuthorized as number) ?? 0,
        }
      : undefined,
  }
}

export async function getRegistryBookConfig(firmId: string): Promise<RegistryBookConfig> {
  const snap = await getDoc(doc(db, 'firms', firmId))
  return mapConfig(snap.data() as Record<string, unknown> | undefined)
}

export async function saveRegistryBookConfig(
  firmId: string,
  config: Omit<RegistryBookConfig, 'printedFolios'>
): Promise<void> {
  const payload: Record<string, unknown> = {
    rowsPerFolio: config.rowsPerFolio,
    firstFolio: config.firstFolio,
    firstEntry: config.firstEntry,
  }
  if (config.diligence) {
    payload.diligence = {
      date: Timestamp.fromDate(config.diligence.date),
      authority: config.diligence.authority,
      reference: config.diligence.reference,
      foliosAuthorized: config.diligence.foliosAuthorized,
    }
  }

  // Cada campo por separado para no pisar printedFolios, que es lo único
  // de esta configuración que no se puede perder: dice qué hojas selladas
  // ya se han gastado.
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() }
  Object.entries(payload).forEach(([k, v]) => {
    updates[`registryBook.${k}`] = v
  })
  await updateDoc(doc(db, 'firms', firmId), updates)
}

export async function markFoliosPrinted(
  firmId: string,
  folios: number[]
): Promise<void> {
  const ref = doc(db, 'firms', firmId)
  const current = await getRegistryBookConfig(firmId)
  const merged = [...new Set([...current.printedFolios, ...folios])].sort(
    (a, b) => a - b
  )
  await updateDoc(ref, {
    'registryBook.printedFolios': merged,
    'registryBook.lastPrintedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { setNextSequenceNumber } from './counters'
import type { ImportRow } from './registryImportParse'
import type { RegistryEntryOrigin } from '@/types'

// Solo la escritura. Descifrar lo que pega el despacho vive en
// registryImportParse.ts, sin dependencias de Firestore, para poder
// probarlo sin navegador.

// ─── Escritura ─────────────────────────────────────────────────────────

const BATCH_LIMIT = 400

/**
 * Escribe los asientos históricos y deja el contador por encima del mayor
 * importado, para que el siguiente asiento de la plataforma continúe la
 * numeración del papel en vez de chocar con ella.
 */
export async function importHistoricEntries(
  firmId: string,
  userId: string,
  firmRnsp: string,
  rows: ImportRow[]
): Promise<number> {
  const ref = collection(db, 'firms', firmId, 'registryBooks')

  for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const row of rows.slice(i, i + BATCH_LIMIT)) {
      const v = row.values
      // Un asiento del papel puede no tener fecha anotada; se usa la de
      // inicio, y si tampoco está, la del propio asiento importado, para
      // que el Archivo pueda agruparlo por año.
      const start = row.startDate ?? new Date()

      batch.set(doc(ref), {
        firmId,
        entryNumber: row.entryNumber,
        origin: 'historico' as RegistryEntryOrigin,
        entryDate: Timestamp.fromDate(start),
        startDate: Timestamp.fromDate(start),
        ...(row.endDate ? { endDate: Timestamp.fromDate(row.endDate) } : {}),
        firmRnsp,
        clientName: v.clientName ?? '',
        clientTaxId: v.clientTaxId ?? '',
        clientType: 'individual',
        clientAddress: v.clientAddress ?? '',
        investigationObject: v.investigationObject ?? '',
        investigatedName: v.investigatedName ?? '',
        investigatedAddress: v.investigatedAddress ?? '',
        knownOffenses: v.knownOffenses ?? '',
        offensesReportedTo: v.offensesReportedTo ?? '',
        detectiveName: v.detectiveName ?? '',
        detectiveTip: v.detectiveTip ?? '',
        physicalLocation: v.physicalLocation ?? '',
        caseId: '',
        caseNumber: '',
        // Cerrado si consta finalización; si no, se importa abierto y ya
        // lo cerrará el despacho.
        status: row.endDate ? 'cerrado' : 'abierto',
        amendments: [],
        createdBy: userId,
        createdAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }

  const highest = Math.max(...rows.map((r) => r.entryNumber!))
  await setNextSequenceNumber(firmId, 'registry', highest + 1)

  return rows.length
}

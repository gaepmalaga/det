import { doc, collection, getDocs, runTransaction, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Secuencias correlativas del despacho. Antes cada servicio hacía
// `getDocs(coleccion).size + 1`, lo que tenía tres problemas:
//
//   1. Dos personas creando a la vez se llevaban el mismo número.
//   2. Al borrar un documento el contador bajaba, así que el siguiente
//      REUTILIZABA un número ya usado. En el libro-registro eso rompe la
//      correlatividad que exige la norma (Reglamento art. 108 y Orden
//      INT/318/2011 art. 17): los asientos no se repiten ni se reciclan.
//   3. Leía la colección entera en cada alta — a 500 asientos, 500
//      lecturas para crear uno.
//
// Cada secuencia vive en firms/{firmId}/counters/{sequence} y se
// incrementa dentro de una transacción, así que el número que sale es
// único aunque haya varias altas simultáneas, y nunca retrocede aunque
// se borren documentos.
export type SequenceName = 'registry' | 'case' | 'contract' | 'quote' | 'contact'

interface CounterDoc {
  // Último número entregado. El siguiente será este + 1.
  lastNumber: number
}

function counterRef(firmId: string, sequence: SequenceName) {
  return doc(db, 'firms', firmId, 'counters', sequence)
}

// De dónde sale el número ya alcanzado en cada secuencia, para sembrar el
// contador la primera vez. Sin esto, un despacho que ya venía usando la
// plataforma antes de existir los contadores volvería a repartir el 1 y
// duplicaría números que ya existen — en el libro-registro, un asiento
// repetido. Algunas colecciones guardan el número como entero y otras
// solo dentro del código («PRE-0007»), así que hay que sacarlo de ahí.
const SEED_SOURCES: Record<
  SequenceName,
  { collection: string; numberField?: string; codeField?: string }
> = {
  registry: { collection: 'registryBooks', numberField: 'entryNumber' },
  case: { collection: 'cases', numberField: 'caseNumberInt' },
  contract: { collection: 'contracts', numberField: 'contractNumberInt' },
  quote: { collection: 'quotes', codeField: 'quoteNumber' },
  contact: { collection: 'contacts', codeField: 'referenceNumber' },
}

// Mayor número ya usado en la colección. Se lee una única vez por
// despacho y secuencia (solo cuando el contador todavía no existe).
async function highestExistingNumber(
  firmId: string,
  sequence: SequenceName
): Promise<number> {
  const source = SEED_SOURCES[sequence]
  const snap = await getDocs(collection(db, 'firms', firmId, source.collection))

  let max = 0
  snap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>

    if (source.numberField) {
      const value = data[source.numberField]
      if (typeof value === 'number' && Number.isFinite(value)) {
        max = Math.max(max, value)
      }
      return
    }

    if (source.codeField) {
      const code = data[source.codeField]
      if (typeof code === 'string') {
        const digits = code.match(/(\d+)\s*$/)
        if (digits) max = Math.max(max, Number(digits[1]))
      }
    }
  })

  return max
}

/**
 * Reserva y devuelve el siguiente número de una secuencia, de forma
 * atómica. `startAt` solo se aplica la primera vez que se usa la
 * secuencia en ese despacho — sirve para que un despacho que llega con
 * el libro de papel por el asiento 200 arranque en el 201 en vez de en
 * el 1.
 */
export async function nextSequenceNumber(
  firmId: string,
  sequence: SequenceName,
  startAt = 1
): Promise<number> {
  const ref = counterRef(firmId, sequence)

  // Una transacción de cliente no puede lanzar consultas, así que el
  // sembrado se calcula fuera y solo cuando hace falta. Si dos personas
  // sembrasen a la vez, la transacción de abajo descarta la semilla en
  // cuanto ve que el contador ya existe, así que no se pierde ningún
  // número.
  let seedFloor = 0
  if (!(await getDoc(ref)).exists()) {
    seedFloor = await highestExistingNumber(firmId, sequence)
  }

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)

    if (!snap.exists()) {
      // El primer número es el mayor entre lo que pida el despacho
      // (arrancar en el 201 porque su libro de papel va por el 200) y lo
      // que ya exista en la base de datos, para no repetir nada.
      const first = Math.max(1, Math.floor(startAt), seedFloor + 1)
      tx.set(ref, { lastNumber: first } satisfies CounterDoc)
      return first
    }

    const current = (snap.data() as CounterDoc).lastNumber ?? 0
    const next = current + 1
    tx.update(ref, { lastNumber: next })
    return next
  })
}

/**
 * Qué número saldría en la próxima alta, sin reservarlo. Para enseñarlo
 * en pantalla ("el siguiente asiento será el 201") sin gastar número.
 */
export async function peekSequenceNumber(
  firmId: string,
  sequence: SequenceName,
  startAt = 1
): Promise<number> {
  const snap = await getDoc(counterRef(firmId, sequence))
  if (snap.exists()) return ((snap.data() as CounterDoc).lastNumber ?? 0) + 1

  const seedFloor = await highestExistingNumber(firmId, sequence)
  return Math.max(1, Math.floor(startAt), seedFloor + 1)
}

/**
 * Coloca el contador para que la siguiente alta salga con el número
 * indicado. Se usa al configurar el libro (el libro de papel manda) y
 * después de importar asientos históricos, para que la plataforma
 * continúe donde lo dejó el papel.
 *
 * No permite retroceder por debajo de lo ya entregado: reutilizar un
 * número que ya existe en el libro rompería la correlatividad.
 */
export async function setNextSequenceNumber(
  firmId: string,
  sequence: SequenceName,
  nextNumber: number
): Promise<void> {
  const ref = counterRef(firmId, sequence)
  const target = Math.max(1, Math.floor(nextNumber)) - 1

  // Si el contador aún no existe, el suelo lo marcan los documentos que
  // ya haya en la colección: colocarlo por debajo repetiría números.
  let seedFloor = 0
  if (!(await getDoc(ref)).exists()) {
    seedFloor = await highestExistingNumber(firmId, sequence)
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const floor = snap.exists()
      ? ((snap.data() as CounterDoc).lastNumber ?? 0)
      : seedFloor

    if (target < floor) {
      throw new Error(
        `Ya existe el número ${floor}. No se puede volver atrás al ${target + 1} sin repetirlo.`
      )
    }

    if (snap.exists()) {
      tx.update(ref, { lastNumber: target })
    } else {
      tx.set(ref, { lastNumber: target } satisfies CounterDoc)
    }
  })
}

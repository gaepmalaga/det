import type { RegistryEntry } from '@/types'

// Casi todos los despachos llevan el libro a mano y, además, una copia en
// Excel. Ese Excel es la vía para traerse el histórico sin teclear
// doscientos asientos: se pega tal cual y aquí se descifra.
//
// Los asientos así importados quedan marcados con origin 'historico', que
// es lo que hace que la revisión del asunto no los trate como
// incompletos: se anotaron en su día con lo que entonces se pedía, y no
// tienen contrato ni informe digital que enseñar.

export const IMPORT_FIELDS = [
  'entryNumber',
  'startDate',
  'endDate',
  'investigationObject',
  'clientName',
  'clientTaxId',
  'clientAddress',
  'investigatedName',
  'investigatedAddress',
  'knownOffenses',
  'offensesReportedTo',
  'detectiveName',
  'detectiveTip',
  'physicalLocation',
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]

export const FIELD_LABELS: Record<ImportField, string> = {
  entryNumber: 'Nº de orden',
  startDate: 'Fecha de inicio',
  endDate: 'Fecha de finalización',
  investigationObject: 'Asunto',
  clientName: 'Contratante',
  clientTaxId: 'NIF/CIF del contratante',
  clientAddress: 'Domicilio del contratante',
  investigatedName: 'Investigado',
  investigatedAddress: 'Domicilio del investigado',
  knownOffenses: 'Delitos de oficio conocidos',
  offensesReportedTo: 'Órgano al que se comunicaron',
  detectiveName: 'Detective actuante',
  detectiveTip: 'TIP',
  physicalLocation: 'Carpeta física',
}

/** Solo el número y el contratante son imprescindibles para que el asiento sirva de algo. */
const REQUIRED: ImportField[] = ['entryNumber', 'clientName']

// ─── Lectura de lo pegado ──────────────────────────────────────────────

/**
 * Excel copia con tabuladores; un CSV exportado, con punto y coma o coma.
 * Se detecta cuál manda contando cuál aparece más en la primera línea, en
 * vez de preguntárselo al despacho.
 */
function detectDelimiter(firstLine: string): string {
  const counts = ['\t', ';', ','].map((d) => [d, firstLine.split(d).length - 1] as const)
  const [best] = counts.sort((a, b) => b[1] - a[1])
  return best[1] > 0 ? best[0] : '\t'
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // Dos comillas seguidas dentro de un campo entrecomillado son una
      // comilla literal, no el final del campo.
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (ch === delimiter && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells.map((c) => c.trim())
}

export interface ParsedTable {
  headers: string[]
  rows: string[][]
}

export function parseTable(text: string): ParsedTable {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  const delimiter = detectDelimiter(lines[0])
  const all = lines.map((l) => splitLine(l, delimiter))
  const width = Math.max(...all.map((r) => r.length))
  const padded = all.map((r) => [...r, ...Array(width - r.length).fill('')])

  return { headers: padded[0], rows: padded.slice(1) }
}

// ─── Adivinar qué columna es cada cosa ─────────────────────────────────

const HINTS: Record<ImportField, string[]> = {
  entryNumber: ['orden', 'numero', 'número', 'nº', 'n°', 'asiento', 'num'],
  startDate: ['inicio', 'alta', 'apertura', 'fecha inicio'],
  endDate: ['fin', 'final', 'cierre', 'terminacion', 'terminación'],
  investigationObject: ['asunto', 'objeto', 'encargo', 'materia'],
  clientName: ['contratante', 'cliente', 'razon', 'razón'],
  clientTaxId: ['nif', 'cif', 'dni', 'documento'],
  clientAddress: ['domicilio del contratante', 'domicilio cliente', 'direccion', 'dirección'],
  investigatedName: ['investigado', 'objetivo'],
  investigatedAddress: ['domicilio del investigado', 'domicilio investigado'],
  knownOffenses: ['delito'],
  offensesReportedTo: ['organo', 'órgano', 'comunicad', 'juzgado'],
  detectiveName: ['detective', 'actuante', 'profesional'],
  detectiveTip: ['tip', 'habilitacion', 'habilitación'],
  physicalLocation: ['carpeta', 'ubicacion', 'ubicación', 'archivador', 'caja'],
}

/**
 * Empareja cada campo con la columna cuyo encabezado más se le parece.
 * Se acierta casi siempre, y lo que no, se corrige a mano en la pantalla:
 * adivinar mal es barato, obligar a mapear catorce columnas a mano no.
 */
export function guessMapping(headers: string[]): Record<ImportField, number> {
  const normalized = headers.map((h) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
  )
  const used = new Set<number>()
  const mapping = {} as Record<ImportField, number>

  for (const field of IMPORT_FIELDS) {
    const hints = HINTS[field].map((h) =>
      h.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    )
    // Las pistas van de más específica a menos ('domicilio del
    // investigado' antes que 'domicilio'), así que gana la primera que
    // encaje y no esté ya cogida.
    let found = -1
    for (const hint of hints) {
      const idx = normalized.findIndex((h, i) => !used.has(i) && h.includes(hint))
      if (idx !== -1) {
        found = idx
        break
      }
    }
    mapping[field] = found
    if (found !== -1) used.add(found)
  }

  return mapping
}

// ─── Interpretar valores ───────────────────────────────────────────────

/** dd/mm/aaaa, dd-mm-aa y aaaa-mm-dd, que es lo que sale de un Excel español. */
export function parseSpanishDate(value: string): Date | null {
  const v = value.trim()
  if (!v) return null

  let year: number, month: number, day: number

  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const dmy = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)

  if (iso) {
    ;[year, month, day] = [+iso[1], +iso[2], +iso[3]]
  } else if (dmy) {
    // Un libro de detectives no tiene asientos del siglo pasado en activo:
    // «24» es 2024, no 1924.
    const y = +dmy[3]
    ;[year, month, day] = [y < 100 ? 2000 + y : y, +dmy[2], +dmy[1]]
  } else {
    return null
  }

  const date = new Date(year, month - 1, day)

  // `new Date(9999, 98, 99)` no falla: desborda hasta el año 10007. Un
  // dedazo en el Excel del despacho se colaría como un asiento de un año
  // inventado, y el Archivo lo agruparía en él. Se comprueba que la fecha
  // construida sea la que se pidió.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

export interface ImportRow {
  line: number
  values: Partial<Record<ImportField, string>>
  entryNumber: number | null
  startDate: Date | null
  endDate: Date | null
  errors: string[]
}

export interface ImportPreview {
  rows: ImportRow[]
  valid: ImportRow[]
  /** Números que ya existen en el libro: no se pueden volver a dar. */
  collisions: number[]
  firstNumber: number | null
  lastNumber: number | null
  /** Huecos en la numeración de lo que se va a importar. */
  gaps: number[]
}

export function buildPreview(
  table: ParsedTable,
  mapping: Record<ImportField, number>,
  existing: RegistryEntry[]
): ImportPreview {
  const taken = new Set(existing.map((e) => e.entryNumber))
  const seen = new Set<number>()

  const rows: ImportRow[] = table.rows.map((cells, i) => {
    const values: Partial<Record<ImportField, string>> = {}
    for (const field of IMPORT_FIELDS) {
      const idx = mapping[field]
      if (idx >= 0 && idx < cells.length) values[field] = cells[idx]
    }

    const errors: string[] = []

    const rawNumber = (values.entryNumber ?? '').replace(/\D/g, '')
    const entryNumber = rawNumber ? Number(rawNumber) : null
    if (entryNumber === null) {
      errors.push('sin nº de orden')
    } else if (taken.has(entryNumber)) {
      errors.push(`el nº ${entryNumber} ya existe en el libro`)
    } else if (seen.has(entryNumber)) {
      errors.push(`el nº ${entryNumber} está repetido en el fichero`)
    }
    if (entryNumber !== null) seen.add(entryNumber)

    for (const field of REQUIRED) {
      if (field !== 'entryNumber' && !values[field]?.trim()) {
        errors.push(`falta ${FIELD_LABELS[field].toLowerCase()}`)
      }
    }

    const startDate = parseSpanishDate(values.startDate ?? '')
    if ((values.startDate ?? '').trim() && !startDate) {
      errors.push('no se entiende la fecha de inicio')
    }
    const endDate = parseSpanishDate(values.endDate ?? '')

    return { line: i + 2, values, entryNumber, startDate, endDate, errors }
  })

  const valid = rows.filter((r) => r.errors.length === 0)
  const numbers = valid.map((r) => r.entryNumber!).sort((a, b) => a - b)
  const collisions = rows
    .filter((r) => r.entryNumber !== null && taken.has(r.entryNumber))
    .map((r) => r.entryNumber!)

  const gaps: number[] = []
  for (let i = 1; i < numbers.length; i++) {
    for (let n = numbers[i - 1] + 1; n < numbers[i]; n++) {
      if (!taken.has(n)) gaps.push(n)
      if (gaps.length > 50) break
    }
  }

  return {
    rows,
    valid,
    collisions,
    firstNumber: numbers[0] ?? null,
    lastNumber: numbers[numbers.length - 1] ?? null,
    gaps,
  }
}

import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { downloadBlob } from '@/lib/download'
import { folioRange, type Folio, type RegistryBookConfig } from './registryFolios'
import type { RegistryEntry, Firm } from '@/types'

function fmtDate(d: Date | undefined): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : ''
}

type Field =
  | 'entryNumber'
  | 'startDate'
  | 'endDate'
  | 'investigationObject'
  | 'clientName'
  | 'clientAddress'
  | 'investigatedName'
  | 'investigatedAddress'
  | 'knownOffenses'
  | 'offensesReportedTo'

interface Column {
  label: string
  width: number
  field: Field
}

interface Group {
  label: string | null
  columns: Column[]
}

// El modelo del Anexo VII de la Orden INT/318/2011 reparte las diez
// columnas en dos páginas enfrentadas: en la izquierda el número de
// orden, el encargo y el contratante; en la derecha el investigado y los
// delitos. Cada folio son por tanto dos caras apaisadas que se colocan una
// al lado de la otra, y las filas de ambas tienen que casar: mismo alto de
// fila y mismo arranque de rejilla en las dos.
const LEFT_GROUPS: Group[] = [
  {
    label: null,
    columns: [{ label: 'Número de orden', width: 22, field: 'entryNumber' }],
  },
  {
    label: 'Encargo de investigación',
    columns: [
      { label: 'Fecha de inicio', width: 30, field: 'startDate' },
      { label: 'Fecha de finalización', width: 32, field: 'endDate' },
      { label: 'Asunto', width: 85, field: 'investigationObject' },
    ],
  },
  {
    label: 'Contratante',
    columns: [
      { label: 'Nombre y apellidos o razón social', width: 53, field: 'clientName' },
      { label: 'Domicilio/localidad', width: 53, field: 'clientAddress' },
    ],
  },
]

const RIGHT_GROUPS: Group[] = [
  {
    label: 'Investigado',
    columns: [
      { label: 'Nombre y apellidos o razón social', width: 65, field: 'investigatedName' },
      { label: 'Domicilio/localidad', width: 65, field: 'investigatedAddress' },
    ],
  },
  {
    label: null,
    columns: [
      {
        label: 'Delitos perseguibles de oficio conocidos',
        width: 75,
        field: 'knownOffenses',
      },
      {
        label: 'Órgano al que se comunicaron',
        width: 70,
        field: 'offensesReportedTo',
      },
    ],
  },
]

function widthOf(groups: Group[]): number {
  return groups.reduce(
    (w, g) => w + g.columns.reduce((cw, c) => cw + c.width, 0),
    0
  )
}

function cellText(e: RegistryEntry, field: Field): string {
  switch (field) {
    case 'entryNumber':
      return String(e.entryNumber)
    case 'startDate':
      return fmtDate(e.startDate)
    case 'endDate':
      return fmtDate(e.endDate)
    default:
      return (e[field] as string) ?? ''
  }
}

const TOP = 12
const GROUP_H = 5
const HEAD_H = 9

/**
 * Un folio son dos caras apaisadas consecutivas: la izquierda y su
 * continuación. Salen seguidas en el PDF (izquierda, derecha, izquierda,
 * derecha...) para imprimirlas a una cara y colocarlas emparejadas.
 *
 * Dentro de cada folio hay exactamente `rowsPerFolio` filas de alto fijo:
 * el asiento nº 214 cae siempre en la misma fila del mismo folio, se
 * imprima hoy o dentro de un año. Es lo que permite imprimir sobre la hoja
 * numerada y sellada que le corresponde, y solo esa.
 */
export function exportFoliosToPdf(
  folios: Folio[],
  firm: Firm,
  config: RegistryBookConfig
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const pageH = doc.internal.pageSize.getHeight()
  const pageW = doc.internal.pageSize.getWidth()

  // Mismo arranque y mismo alto de fila en las dos caras: es lo que hace
  // que, puestas una al lado de la otra, las líneas coincidan.
  const bottom = pageH - 14
  const gridTop = TOP + 14 + GROUP_H + HEAD_H
  const rowH = (bottom - gridTop) / config.rowsPerFolio

  let first = true
  folios.forEach((folio) => {
    for (const side of ['left', 'right'] as const) {
      if (!first) doc.addPage()
      first = false
      drawSide(doc, folio, firm, config, side, gridTop, rowH, pageW, pageH)
    }
  })

  const label =
    folios.length === 1
      ? `folio-${folios[0].number}`
      : `folios-${folios[0].number}-${folios[folios.length - 1].number}`
  downloadBlob(doc.output('blob'), `libro-registro_${label}.pdf`)
}

function drawSide(
  doc: jsPDF,
  folio: Folio,
  firm: Firm,
  config: RegistryBookConfig,
  side: 'left' | 'right',
  gridTop: number,
  rowH: number,
  pageW: number,
  pageH: number
) {
  const groups = side === 'left' ? LEFT_GROUPS : RIGHT_GROUPS
  const columns = groups.flatMap((g) => g.columns)
  const tableW = widthOf(groups)
  const startX = (pageW - tableW) / 2
  const [from] = folioRange(folio.number, config)

  // ── Encabezado ──
  doc.setFont('helvetica', 'bold').setFontSize(10)
  doc.text(
    `LIBRO-REGISTRO DE DETECTIVES PRIVADOS — ${(firm.tradeName || firm.legalName).toUpperCase()}`,
    startX,
    TOP
  )
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(70)
  doc.text(
    `Nº de registro (RNSP): ${firm.rnsp || '—'}   ·   Orden INT/318/2011, Anexo VII`,
    startX,
    TOP + 4.5
  )
  doc.setTextColor(0)

  doc.setFont('helvetica', 'bold').setFontSize(13)
  doc.text(`Folio ${folio.number}`, pageW - startX, TOP + 1, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(70)
  doc.text(
    side === 'left' ? 'cara izquierda' : 'cara derecha · continuación',
    pageW - startX,
    TOP + 5,
    { align: 'right' }
  )
  doc.setTextColor(0)

  // ── Cabecera de dos niveles ──
  let y = TOP + 14
  let x = startX
  doc.setFont('helvetica', 'bold').setFontSize(7)

  for (const group of groups) {
    const width = group.columns.reduce((w, c) => w + c.width, 0)
    doc.setFillColor(232, 232, 232)
    doc.rect(x, y, width, GROUP_H, 'F')
    doc.setDrawColor(120)
    doc.rect(x, y, width, GROUP_H)
    // Las columnas sin grupo dejan la celda de arriba vacía y se leen
    // sobre los dos niveles, igual que en el modelo.
    if (group.label) {
      doc.text(group.label, x + width / 2, y + 3.5, { align: 'center' })
    }
    x += width
  }

  y += GROUP_H
  x = startX
  doc.setFontSize(6.6)
  for (const col of columns) {
    doc.setFillColor(243, 243, 243)
    doc.rect(x, y, col.width, HEAD_H, 'F')
    doc.setDrawColor(120)
    doc.rect(x, y, col.width, HEAD_H)
    const lines = doc.splitTextToSize(col.label, col.width - 2) as string[]
    const offset = (HEAD_H - lines.length * 2.5) / 2 + 2
    doc.text(lines, x + col.width / 2, y + offset, { align: 'center' })
    x += col.width
  }

  // ── Filas: siempre rowsPerFolio, escritas o en blanco ──
  doc.setFont('helvetica', 'normal').setFontSize(7)
  for (let i = 0; i < config.rowsPerFolio; i++) {
    const rowY = gridTop + i * rowH
    const entry = folio.entries.find((e) => e.entryNumber === from + i)

    x = startX
    for (const col of columns) {
      doc.setDrawColor(150)
      doc.rect(x, rowY, col.width, rowH)

      const text = entry ? cellText(entry, col.field) : ''
      if (text) {
        const lines = doc.splitTextToSize(text, col.width - 2) as string[]
        // Una celda no puede desbordar el folio: si el texto no cabe, se
        // recorta. El libro es un índice, no el archivo — el asiento
        // completo está en el PDF del asunto.
        const maxLines = Math.max(1, Math.floor((rowH - 1.5) / 2.8))
        const shown = lines.slice(0, maxLines)
        if (lines.length > maxLines && shown.length > 0) {
          shown[shown.length - 1] = shown[shown.length - 1].slice(0, -1) + '…'
        }
        const centered = col.field === 'entryNumber'
        doc.text(
          shown,
          centered ? x + col.width / 2 : x + 1.2,
          rowY + 3.4,
          centered ? { align: 'center' } : undefined
        )
      }
      x += col.width
    }
  }

  // ── Pie: diligencia de habilitación ──
  doc.setFontSize(6.4).setTextColor(90)
  const d = config.diligence
  const footer = d
    ? `Libro habilitado por diligencia ${d.reference} de ${fmtDate(d.date)}, ${d.authority} — ${d.foliosAuthorized} folios.`
    : 'Diligencia de habilitación pendiente de registrar en la plataforma.'
  // Sin fecha de impresión ni recuento: lo que se imprime aquí es una
  // hoja del libro, y en una hoja del libro no va nada que no sea el
  // libro. Cuándo se imprimió cada folio queda registrado en la
  // plataforma, que es donde hace falta.
  doc.text(footer, startX, pageH - 8)
  doc.setTextColor(0)
}

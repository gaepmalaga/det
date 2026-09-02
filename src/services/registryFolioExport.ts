import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { downloadBlob } from '@/lib/download'
import { folioRange, type Folio, type RegistryBookConfig } from './registryFolios'
import type { RegistryEntry, Firm } from '@/types'

function fmtDate(d: Date | undefined): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : ''
}

// Cabecera de dos niveles, calcada del modelo del Anexo VII de la Orden
// INT/318/2011: «Número de orden» va suelto, y después tres grupos —
// Encargo de investigación, Contratante e Investigado— cada uno sobre sus
// columnas, más las dos últimas también sueltas.
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

const GROUPS: Group[] = [
  {
    label: null,
    columns: [{ label: 'Número de orden', width: 16, field: 'entryNumber' }],
  },
  {
    label: 'Encargo de investigación',
    columns: [
      { label: 'Fecha de inicio', width: 19, field: 'startDate' },
      { label: 'Fecha de finalización', width: 19, field: 'endDate' },
      { label: 'Asunto', width: 47, field: 'investigationObject' },
    ],
  },
  {
    label: 'Contratante',
    columns: [
      { label: 'Nombre y apellidos o razón social', width: 34, field: 'clientName' },
      { label: 'Domicilio/localidad', width: 33, field: 'clientAddress' },
    ],
  },
  {
    label: 'Investigado',
    columns: [
      { label: 'Nombre y apellidos o razón social', width: 34, field: 'investigatedName' },
      { label: 'Domicilio/localidad', width: 33, field: 'investigatedAddress' },
    ],
  },
  {
    label: null,
    columns: [
      {
        label: 'Delitos perseguibles de oficio conocidos',
        width: 30,
        field: 'knownOffenses',
      },
      {
        label: 'Órgano al que se comunicaron',
        width: 28,
        field: 'offensesReportedTo',
      },
    ],
  },
]

const COLUMNS = GROUPS.flatMap((g) => g.columns)
const TABLE_WIDTH = COLUMNS.reduce((w, c) => w + c.width, 0)

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
 * Un folio por página, con exactamente `rowsPerFolio` filas de alto fijo:
 * el asiento nº 214 cae siempre en la misma fila del mismo folio, se
 * imprima hoy o dentro de un año. Es lo que permite imprimir sobre la hoja
 * numerada y sellada que corresponde, y solo esa.
 */
export function exportFoliosToPdf(
  folios: Folio[],
  firm: Firm,
  config: RegistryBookConfig
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const pageH = doc.internal.pageSize.getHeight()
  const pageW = doc.internal.pageSize.getWidth()
  const startX = (pageW - TABLE_WIDTH) / 2

  // Alto de fila repartido a partes iguales en lo que queda de página: el
  // folio siempre ocupa la hoja entera, con o sin asientos escritos.
  const bottom = pageH - 14
  const gridTop = TOP + 14 + GROUP_H + HEAD_H
  const rowH = (bottom - gridTop) / config.rowsPerFolio

  folios.forEach((folio, index) => {
    if (index > 0) doc.addPage()
    drawFolio(doc, folio, firm, config, startX, gridTop, rowH, pageW, pageH)
  })

  const label =
    folios.length === 1
      ? `folio-${folios[0].number}`
      : `folios-${folios[0].number}-${folios[folios.length - 1].number}`
  downloadBlob(doc.output('blob'), `libro-registro_${label}.pdf`)
}

function drawFolio(
  doc: jsPDF,
  folio: Folio,
  firm: Firm,
  config: RegistryBookConfig,
  startX: number,
  gridTop: number,
  rowH: number,
  pageW: number,
  pageH: number
) {
  const [from, to] = folioRange(folio.number, config)

  // Encabezado del folio
  doc.setFont('helvetica', 'bold').setFontSize(10)
  doc.text(
    `LIBRO-REGISTRO DE DETECTIVES PRIVADOS — ${(firm.tradeName || firm.legalName).toUpperCase()}`,
    startX,
    TOP
  )
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(70)
  doc.text(
    `Nº de registro (RNSP): ${firm.rnsp || '—'}   ·   Orden INT/318/2011, Anexo VII   ·   Asientos ${from} a ${to}`,
    startX,
    TOP + 4.5
  )
  doc.setTextColor(0)

  // El nº de folio, grande y arriba a la derecha, para casarlo con la hoja
  // numerada y sellada sobre la que se imprime.
  doc.setFont('helvetica', 'bold').setFontSize(13)
  doc.text(`Folio ${folio.number}`, pageW - startX, TOP + 1, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(7)

  // ── Cabecera de dos niveles ──
  let y = TOP + 14
  let x = startX
  doc.setFont('helvetica', 'bold').setFontSize(7)

  for (const group of GROUPS) {
    const width = group.columns.reduce((w, c) => w + c.width, 0)
    if (group.label) {
      doc.setFillColor(232, 232, 232)
      doc.rect(x, y, width, GROUP_H, 'F')
      doc.setDrawColor(120)
      doc.rect(x, y, width, GROUP_H)
      doc.text(group.label, x + width / 2, y + 3.5, { align: 'center' })
    } else {
      // Las columnas sin grupo ocupan los dos niveles: la celda del nivel
      // superior se funde con la de abajo, igual que en el modelo.
      doc.setFillColor(232, 232, 232)
      doc.rect(x, y, width, GROUP_H, 'F')
      doc.setDrawColor(120)
      doc.rect(x, y, width, GROUP_H)
    }
    x += width
  }

  y += GROUP_H
  x = startX
  doc.setFontSize(6.2)
  for (const col of COLUMNS) {
    doc.setFillColor(243, 243, 243)
    doc.rect(x, y, col.width, HEAD_H, 'F')
    doc.setDrawColor(120)
    doc.rect(x, y, col.width, HEAD_H)
    const lines = doc.splitTextToSize(col.label, col.width - 2) as string[]
    const offset = (HEAD_H - lines.length * 2.4) / 2 + 2
    doc.text(lines, x + col.width / 2, y + offset, { align: 'center' })
    x += col.width
  }

  // ── Filas: siempre rowsPerFolio, escritas o en blanco ──
  doc.setFont('helvetica', 'normal').setFontSize(6.4)
  for (let i = 0; i < config.rowsPerFolio; i++) {
    const rowY = gridTop + i * rowH
    const entry = folio.entries.find((e) => e.entryNumber === from + i)

    x = startX
    for (const col of COLUMNS) {
      doc.setDrawColor(150)
      doc.rect(x, rowY, col.width, rowH)

      if (entry) {
        const text = cellText(entry, col.field)
        if (text) {
          const lines = doc.splitTextToSize(text, col.width - 2) as string[]
          // Una celda no puede desbordar el folio: si el texto no cabe en
          // la fila, se recorta. El asiento completo está en el expediente
          // y en el PDF del asunto; el libro es un índice, no el archivo.
          const maxLines = Math.max(1, Math.floor((rowH - 1.5) / 2.5))
          const shown = lines.slice(0, maxLines)
          if (lines.length > maxLines && shown.length > 0) {
            shown[shown.length - 1] = shown[shown.length - 1].slice(0, -1) + '…'
          }
          doc.text(
            shown,
            col.field === 'entryNumber' ? x + col.width / 2 : x + 1,
            rowY + 3,
            col.field === 'entryNumber' ? { align: 'center' } : undefined
          )
        }
      }
      x += col.width
    }
  }

  // ── Pie: diligencia de habilitación ──
  doc.setFontSize(6.2).setTextColor(90)
  const d = config.diligence
  const footer = d
    ? `Libro habilitado por diligencia ${d.reference} de ${fmtDate(d.date)}, ${d.authority} — ${d.foliosAuthorized} folios.`
    : 'Diligencia de habilitación pendiente de registrar en la plataforma.'
  doc.text(footer, startX, pageH - 8)
  doc.text(
    `Impreso el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
    pageW - startX,
    pageH - 8,
    { align: 'right' }
  )
  doc.setTextColor(0)
}

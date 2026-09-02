import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { downloadBlob } from '@/lib/download'
import type { RegistryEntry, Firm } from '@/types'

function fmtDate(d: Date | undefined): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : ''
}

function csvEscape(value: string): string {
  const v = value.replace(/"/g, '""')
  return /[",\n;]/.test(v) ? `"${v}"` : v
}

const CSV_HEADERS = [
  'Número de orden',
  'Fecha de inicio',
  'Fecha de finalización',
  'Asunto',
  'Contratante — Nombre y apellidos o razón social',
  'Contratante — Domicilio/localidad',
  'Investigado — Nombre y apellidos o razón social',
  'Investigado — Domicilio/localidad',
  'Delitos perseguibles de oficio conocidos',
  'Órgano al que se comunicaron',
]

function entryToRow(e: RegistryEntry): string[] {
  return [
    String(e.entryNumber),
    fmtDate(e.startDate),
    fmtDate(e.endDate),
    e.investigationObject,
    e.clientName,
    e.clientAddress,
    e.investigatedName,
    e.investigatedAddress,
    e.knownOffenses,
    e.offensesReportedTo,
  ]
}

export function exportRegistryToCsv(entries: RegistryEntry[], firmRnsp: string): void {
  const rows = [CSV_HEADERS, ...entries.map(entryToRow)]
  const csv = '﻿' + rows.map((r) => r.map(csvEscape).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `libro-registro_${firmRnsp || 'despacho'}.csv`)
}

// Columnas y anchos calcados del modelo oficial (Anexo VII, Orden
// INT/318/2011): Encargo de investigación (nº, fechas) — Asunto —
// Contratante (nombre, domicilio) — Investigado (nombre, domicilio) —
// Delitos perseguibles de oficio conocidos — Órgano al que se
// comunicaron. En A4 apaisado para que quepan las 10 columnas legibles.
const COLUMNS: { label: string; width: number; key: keyof RegistryEntry | 'startDateFmt' | 'endDateFmt' }[] = [
  { label: 'Nº', width: 10, key: 'entryNumber' },
  { label: 'F. inicio', width: 18, key: 'startDateFmt' },
  { label: 'F. fin', width: 18, key: 'endDateFmt' },
  { label: 'Asunto', width: 38, key: 'investigationObject' },
  { label: 'Contratante', width: 30, key: 'clientName' },
  { label: 'Domicilio contratante', width: 32, key: 'clientAddress' },
  { label: 'Investigado', width: 30, key: 'investigatedName' },
  { label: 'Domicilio investigado', width: 32, key: 'investigatedAddress' },
  { label: 'Delitos conocidos', width: 30, key: 'knownOffenses' },
  { label: 'Órgano comunicado', width: 29, key: 'offensesReportedTo' },
]

function cellText(e: RegistryEntry, col: (typeof COLUMNS)[number]): string {
  if (col.key === 'startDateFmt') return fmtDate(e.startDate)
  if (col.key === 'endDateFmt') return fmtDate(e.endDate)
  const val = e[col.key as keyof RegistryEntry]
  if (val === undefined || val === null) return ''
  return String(val)
}

export function exportRegistryToPdf(
  entries: RegistryEntry[],
  firm: Firm,
  rangeLabel: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 12
  const marginTop = 22
  const marginBottom = 14
  const fontSize = 7
  const lineHeight = 3.4
  const cellPadding = 1.2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)

  function drawHeader(y: number): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`Libro-registro de detectives — ${firm.tradeName || firm.legalName} (RNSP ${firm.rnsp})`, marginX, y)
    y += 5
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90)
    doc.text(rangeLabel, marginX, y)
    doc.setTextColor(0)
    y += 4
    return y
  }

  function drawTableHeaderRow(y: number): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fontSize)
    let x = marginX
    const headerHeight = 8
    for (const col of COLUMNS) {
      doc.setFillColor(240, 240, 240)
      doc.rect(x, y, col.width, headerHeight, 'F')
      doc.setDrawColor(180)
      doc.rect(x, y, col.width, headerHeight)
      const lines = doc.splitTextToSize(col.label, col.width - cellPadding * 2)
      doc.text(lines, x + cellPadding, y + 3)
      x += col.width
    }
    doc.setFont('helvetica', 'normal')
    return y + headerHeight
  }

  let y = drawHeader(marginTop)
  y = drawTableHeaderRow(y)

  for (const entry of entries) {
    const cellLines = COLUMNS.map((col) =>
      doc.splitTextToSize(cellText(entry, col) || '—', col.width - cellPadding * 2)
    )
    const maxLines = Math.max(...cellLines.map((l) => l.length), 1)
    const rowHeight = Math.max(maxLines * lineHeight + cellPadding * 2, 7)

    if (y + rowHeight > pageHeight - marginBottom) {
      doc.addPage()
      y = marginTop
      y = drawTableHeaderRow(y)
    }

    let x = marginX
    for (let i = 0; i < COLUMNS.length; i++) {
      const col = COLUMNS[i]
      doc.setDrawColor(200)
      doc.rect(x, y, col.width, rowHeight)
      doc.text(cellLines[i], x + cellPadding, y + cellPadding + lineHeight - 0.8)
      x += col.width
    }
    y += rowHeight
  }

  doc.setFontSize(7)
  doc.setTextColor(120)
  doc.text(
    `${entries.length} asiento${entries.length === 1 ? '' : 's'} — generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
    marginX,
    pageHeight - 6
  )

  downloadBlob(doc.output('blob'), `libro-registro_${firm.rnsp || 'despacho'}.pdf`)
}

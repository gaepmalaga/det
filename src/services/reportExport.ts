import { jsPDF } from 'jspdf'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from 'docx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Report } from './reports'
import type { Firm } from '@/types'

function firmDisplayName(firm: Firm): string {
  return firm.tradeName || firm.legalName
}

function firmAddressLine(firm: Firm): string {
  const a = firm.registeredAddress
  return `${a.street}, ${a.postalCode} ${a.city} (${a.province})`
}

interface ReportSection {
  title: string
  body: string
}

function buildSections(report: Report): ReportSection[] {
  const sections: ReportSection[] = [
    { title: 'Datos del contratante', body: `${report.clientName}${report.clientTaxId ? ` — NIF/NIE: ${report.clientTaxId}` : ''}` },
    {
      title: 'Detectives intervinientes',
      body: report.detectives
        .map((d) => `${d.detectiveName}${d.detectiveTip ? ` (TIP: ${d.detectiveTip})` : ''}`)
        .join('\n'),
    },
    { title: 'Objeto de la contratación', body: report.serviceObject },
    { title: 'Medios utilizados', body: report.methodsUsed },
    { title: 'Actuaciones realizadas', body: report.actionsPerformed },
    { title: 'Resultados obtenidos', body: report.results },
  ]
  if (report.conclusions) sections.push({ title: 'Conclusiones', body: report.conclusions })
  if (report.observations) sections.push({ title: 'Observaciones', body: report.observations })
  if (report.deliveredAt) {
    sections.push({
      title: 'Entrega',
      body: `Entregado a ${report.deliveredTo} el ${format(report.deliveredAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}`,
    })
  }
  return sections
}

function reportFileName(report: Report, extension: string): string {
  const safeNumber = report.registryNumber.replace(/[^a-zA-Z0-9-]/g, '_')
  return `informe_${safeNumber}.${extension}`
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement('a')
  a.href = url
  a.download = filename
  window.document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportReportToPdf(report: Report, firm: Firm): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 20
  const maxWidth = pageWidth - marginX * 2
  let y = 20

  function ensureSpace(lines: number, lineHeight: number) {
    if (y + lines * lineHeight > pageHeight - 20) {
      doc.addPage()
      y = 20
    }
  }

  // Membrete
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(firmDisplayName(firm), marginX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(`NIF: ${firm.taxId} · Nº RNSP: ${firm.rnsp}`, marginX, y)
  y += 4.5
  doc.text(firmAddressLine(firm), marginX, y)
  y += 8
  doc.setDrawColor(200)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 10
  doc.setTextColor(0)

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Informe de investigación', marginX, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`Nº de registro: ${report.registryNumber}`, marginX, y)
  y += 5
  doc.text(`Fecha: ${format(report.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}`, marginX, y)
  y += 10
  doc.setTextColor(0)

  const lineHeight = 5.2
  for (const section of buildSections(report)) {
    ensureSpace(2, lineHeight)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(section.title, marginX, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(section.body || '—', maxWidth)
    for (const line of lines) {
      ensureSpace(1, lineHeight)
      doc.text(line, marginX, y)
      y += lineHeight
    }
    y += 5
  }

  downloadBlob(doc.output('blob'), reportFileName(report, 'pdf'))
}

export async function exportReportToDocx(report: Report, firm: Firm): Promise<void> {
  const heading = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    })

  const body = (text: string) =>
    new Paragraph({
      children: (text || '—').split('\n').flatMap((line, i) => (i === 0 ? [new TextRun(line)] : [new TextRun({ text: line, break: 1 })])),
      spacing: { after: 200 },
    })

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: firmDisplayName(firm), bold: true, size: 28 })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `NIF: ${firm.taxId} · Nº RNSP: ${firm.rnsp}`,
          size: 18,
          color: '5A5A5A',
        }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: firmAddressLine(firm), size: 18, color: '5A5A5A' })],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 8 },
      },
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Informe de investigación', bold: true, size: 32 })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Nº de registro: ${report.registryNumber}`,
          size: 18,
          color: '5A5A5A',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Fecha: ${format(report.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}`,
          size: 18,
          color: '5A5A5A',
        }),
      ],
      spacing: { after: 200 },
    }),
  ]

  for (const section of buildSections(report)) {
    children.push(heading(section.title))
    children.push(body(section.body))
  }

  const reportDoc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
    title: `Informe ${report.registryNumber}`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
  })

  const blob = await Packer.toBlob(reportDoc)
  downloadBlob(blob, reportFileName(report, 'docx'))
}

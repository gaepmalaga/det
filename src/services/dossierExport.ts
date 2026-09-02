import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { downloadBlob } from '@/lib/download'
import { dossierGaps, type Dossier } from './dossier'

const MARGIN = 18
const PAGE_W = 210
const PAGE_H = 297
const BODY_W = PAGE_W - MARGIN * 2

function fmt(d?: Date): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : '—'
}

// El PDF que se imprime y se entrega en mano cuando la inspección señala
// una línea del libro. Todo lo del asunto, en el orden en que se pregunta:
// el asiento, quién contrató, qué se presupuestó, qué se firmó, qué se
// hizo y qué se informó.
class Sheet {
  private doc: jsPDF
  private y = MARGIN
  private footer: string

  constructor(footer: string) {
    this.footer = footer
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' })
  }

  private room(needed: number) {
    if (this.y + needed > PAGE_H - MARGIN - 8) {
      this.doc.addPage()
      this.y = MARGIN
    }
  }

  title(text: string, sub: string) {
    this.doc.setFont('helvetica', 'bold').setFontSize(15)
    this.doc.text(text, MARGIN, this.y)
    this.y += 6
    this.doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90)
    this.doc.text(sub, MARGIN, this.y)
    this.doc.setTextColor(0)
    this.y += 8
  }

  section(text: string) {
    this.room(14)
    this.y += 3
    this.doc.setDrawColor(200).line(MARGIN, this.y, PAGE_W - MARGIN, this.y)
    this.y += 5
    this.doc.setFont('helvetica', 'bold').setFontSize(11)
    this.doc.text(text, MARGIN, this.y)
    this.y += 6
  }

  field(label: string, value?: string) {
    const text = value?.trim() || '—'
    const lines = this.doc.setFont('helvetica', 'normal').setFontSize(9)
      .splitTextToSize(text, BODY_W - 45) as string[]
    this.room(lines.length * 4.5 + 2)
    this.doc.setTextColor(110).setFontSize(8)
    this.doc.text(label, MARGIN, this.y)
    this.doc.setTextColor(0).setFontSize(9)
    this.doc.text(lines, MARGIN + 45, this.y)
    this.y += Math.max(4.8, lines.length * 4.2) + 1.6
  }

  paragraph(text: string) {
    const lines = this.doc.setFont('helvetica', 'normal').setFontSize(9)
      .splitTextToSize(text, BODY_W) as string[]
    this.room(lines.length * 4.2)
    this.doc.text(lines, MARGIN, this.y)
    this.y += lines.length * 4.2 + 2
  }

  note(text: string) {
    this.room(6)
    this.doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(110)
    this.doc.text(text, MARGIN, this.y)
    this.doc.setFont('helvetica', 'normal').setTextColor(0)
    this.y += 5
  }

  blob(): Blob {
    // La numeración de páginas se estampa al final, cuando ya se sabe
    // cuántas hay: un dossier entregado suelto tiene que poder recomponerse.
    const total = this.doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p)
      this.doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(130)
      this.doc.text(this.footer, MARGIN, PAGE_H - 10)
      this.doc.text(`Página ${p} de ${total}`, PAGE_W - MARGIN, PAGE_H - 10, {
        align: 'right',
      })
    }
    return this.doc.output('blob')
  }
}

export async function exportDossierPdf(dossier: Dossier): Promise<void> {
  const { entry, caseData, client, quote, contracts, report, actions } = dossier
  const s = new Sheet(
    `Asiento nº ${entry.entryNumber} · ${entry.firmRnsp || 'Despacho'} · Generado el ${fmt(new Date())}`
  )

  s.title(
    `Asiento nº ${entry.entryNumber}`,
    `Libro-registro de servicios de investigación privada${
      entry.caseNumber ? ` · Expediente ${entry.caseNumber}` : ''
    }`
  )

  s.section('Asiento del libro (Anexo VII, Orden INT/318/2011)')
  s.field('Nº de orden', String(entry.entryNumber))
  s.field('Nº registro despacho', entry.firmRnsp)
  s.field('Fecha de inicio', fmt(entry.startDate))
  s.field('Fecha finalización', entry.endDate ? fmt(entry.endDate) : 'En curso')
  s.field('Contratante', entry.clientName)
  s.field('NIF / CIF', entry.clientTaxId)
  s.field('Domicilio', entry.clientAddress)
  s.field('Objeto', entry.investigationObject)
  s.field('Investigado', entry.investigatedName)
  s.field('Domicilio investigado', entry.investigatedAddress)
  s.field('Detective actuante', entry.detectiveName)
  s.field('TIP', entry.detectiveTip)
  if (entry.knownOffenses) {
    s.field('Delitos de oficio', entry.knownOffenses)
    s.field('Comunicado a', entry.offensesReportedTo)
  }
  if (entry.physicalLocation) s.field('Carpeta física', entry.physicalLocation)
  if (entry.origin === 'historico') {
    s.note(
      'Asiento anotado originalmente en el libro en papel e incorporado después a la plataforma.'
    )
  }

  if (entry.amendments.length > 0) {
    s.section('Rectificaciones')
    entry.amendments.forEach((a) => {
      s.field(
        fmt(a.amendedAt),
        `${a.field}: «${a.oldValue || '—'}» → «${a.newValue || '—'}». Motivo: ${a.reason}`
      )
    })
  }

  s.section('Contratante')
  if (client) {
    s.field('Nombre / razón social', client.legalName)
    s.field('NIF / CIF', client.taxId)
    s.field('Email', client.email)
    s.field('Teléfono', client.phone)
  } else {
    s.paragraph('No hay ficha de cliente vinculada a este asiento.')
  }

  s.section('Presupuesto')
  if (quote) {
    s.field('Número', quote.quoteNumber)
    s.field('Estado', quote.status)
    s.field('Importe', `${quote.amount} €`)
    s.field('Descripción', quote.description)
  } else {
    s.paragraph('No consta presupuesto para este asiento.')
  }

  s.section('Contrato')
  if (contracts.length === 0) {
    s.paragraph('No consta contrato para este asiento.')
  } else {
    contracts.forEach((c) => {
      s.field(c.contractNumber, `${c.status}${c.signedAt ? ` el ${fmt(c.signedAt)}` : ''}`)
      if (c.signedByName) s.field('Firmado por', c.signedByName)
      if (c.serviceDescription) s.field('Objeto', c.serviceDescription)
      if (c.agreedPrice) s.field('Precio', c.agreedPrice)
    })
  }

  s.section('Encargo')
  if (caseData) {
    s.field('Tipo', caseData.investigationTypeCustom || caseData.investigationType)
    s.field('Objeto y alcance', caseData.objectScope)
    s.field('Interés legítimo', caseData.legitimateInterest)
    s.field('Estado', caseData.status)
  } else {
    s.paragraph('Este asiento no tiene expediente asociado en la plataforma.')
  }

  s.section(`Actuaciones (${actions.length})`)
  if (actions.length === 0) {
    s.paragraph('No hay actuaciones anotadas.')
  } else {
    actions.forEach((a) => {
      const when = format(a.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })
      s.field(when, `${a.detectiveTip ? `TIP ${a.detectiveTip}. ` : ''}${a.description}`)
    })
  }

  s.section('Informe')
  if (!report) {
    s.paragraph('No consta informe de investigación para este asiento.')
  } else {
    s.field('Estado', report.status)
    s.field('Objeto del servicio', report.serviceObject)
    s.field('Medios empleados', report.methodsUsed)
    s.field('Actuaciones', report.actionsPerformed)
    s.field('Resultados', report.results)
    if (report.conclusions) s.field('Conclusiones', report.conclusions)
    s.field(
      'Entrega',
      report.deliveredAt
        ? `${fmt(report.deliveredAt)}${report.deliveredTo ? ` a ${report.deliveredTo}` : ''}`
        : 'Sin entregar'
    )
    s.field(
      'Detectives',
      report.detectives.map((d) => `${d.detectiveName} (TIP ${d.detectiveTip})`).join('; ')
    )
  }

  // Va al final a propósito: quien recibe el dossier ve primero el
  // contenido y después, con nombre y apellidos, lo que le falta. Ocultarlo
  // no lo haría desaparecer en una inspección.
  const gaps = dossierGaps(dossier)
  s.section('Revisión del asunto')
  if (gaps.length === 0) {
    s.paragraph('No se han detectado ausencias en la documentación de este asiento.')
  } else {
    gaps.forEach((g) => {
      s.field(g.severity === 'critical' ? 'Exigible' : 'Aviso', `${g.label}. ${g.detail}`)
    })
  }

  downloadBlob(s.blob(), `asiento-${entry.entryNumber}.pdf`)
}

import JSZip from 'jszip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { downloadBlob } from '@/lib/download'
import type { RegistryEntry } from '@/types'

// El CSV que había antes era UTF-8 con BOM y aun así Excel destrozaba los
// acentos según con qué locale se abriera, y el resultado eran diez
// columnas del mismo ancho con el texto cortado. Un .xlsx no tiene ese
// problema: por dentro es XML dentro de un zip, siempre UTF-8, y permite
// dejar los anchos de columna, la fila de encabezados fija y el texto
// ajustado, que es lo que hace que se pueda leer.
//
// Se escribe a mano en vez de traer una librería de hojas de cálculo
// entera —cientos de kilobytes— para generar una tabla de diez columnas.

function esc(value: string): string {
  let out = ''
  for (const ch of value) {
    const code = ch.codePointAt(0)!
    // Excel rechaza el fichero entero si aparece un caracter de control.
    // De un Excel ajeno importado puede venir cualquier cosa, asi que se
    // filtran todos menos el salto de linea y el tabulador.
    if (code < 32 && code !== 10 && code !== 9) continue
    if (ch === '&') out += '&amp;'
    else if (ch === '<') out += '&lt;'
    else if (ch === '>') out += '&gt;'
    else if (ch === '"') out += '&quot;'
    else out += ch
  }
  return out
}

function colName(index: number): string {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

interface Column {
  header: string
  width: number
  value: (e: RegistryEntry) => string
  numeric?: boolean
}

function fmtDate(d: Date | undefined): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : ''
}

// Las diez columnas del Anexo VII, en su orden, con los encabezados del
// modelo — sin la raya larga que antes unía grupo y columna y que era
// justo el carácter que peor se veía al abrirlo.
const COLUMNS: Column[] = [
  { header: 'Número de orden', width: 14, value: (e) => String(e.entryNumber), numeric: true },
  { header: 'Fecha de inicio', width: 14, value: (e) => fmtDate(e.startDate) },
  { header: 'Fecha de finalización', width: 16, value: (e) => fmtDate(e.endDate) },
  { header: 'Asunto', width: 52, value: (e) => e.investigationObject },
  { header: 'Contratante', width: 28, value: (e) => e.clientName },
  { header: 'NIF / CIF del contratante', width: 18, value: (e) => e.clientTaxId },
  { header: 'Domicilio del contratante', width: 34, value: (e) => e.clientAddress },
  { header: 'Investigado', width: 28, value: (e) => e.investigatedName },
  { header: 'Domicilio del investigado', width: 34, value: (e) => e.investigatedAddress },
  { header: 'Delitos perseguibles de oficio conocidos', width: 30, value: (e) => e.knownOffenses },
  { header: 'Órgano al que se comunicaron', width: 26, value: (e) => e.offensesReportedTo },
  { header: 'Detective actuante', width: 24, value: (e) => e.detectiveName },
  { header: 'TIP', width: 12, value: (e) => e.detectiveTip },
]

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

// Tres estilos: 0 normal, 1 encabezado (negrita, fondo, centrado), 2 celda
// con el texto ajustado y pegado arriba, que es como se lee un asunto
// largo sin que la fila parezca vacía.
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FFBFBFBF"/></left>
<right style="thin"><color rgb="FFBFBFBF"/></right>
<top style="thin"><color rgb="FFBFBFBF"/></top>
<bottom style="thin"><color rgb="FFBFBFBF"/></bottom>
<diagonal/>
</border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
</styleSheet>`

function workbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
}

function cell(ref: string, value: string, style: number, numeric: boolean): string {
  if (!value) return `<c r="${ref}" s="${style}"/>`
  if (numeric && /^\d+$/.test(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`
  }
  // Cadenas en línea: evita la tabla de cadenas compartidas, que es la
  // parte del formato donde es más fácil generar un fichero corrupto.
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`
}

function sheetXml(entries: RegistryEntry[]): string {
  const cols = COLUMNS.map(
    (c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`
  ).join('')

  const header = `<row r="1" ht="30" customHeight="1">${COLUMNS.map((c, i) =>
    cell(`${colName(i)}1`, c.header, 1, false)
  ).join('')}</row>`

  const rows = entries
    .map((e, r) => {
      const n = r + 2
      return `<row r="${n}">${COLUMNS.map((c, i) =>
        cell(`${colName(i)}${n}`, c.value(e) ?? '', 2, !!c.numeric)
      ).join('')}</row>`
    })
    .join('')

  const lastCol = colName(COLUMNS.length - 1)

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0" tabSelected="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${header}${rows}</sheetData>
<autoFilter ref="A1:${lastCol}${entries.length + 1}"/>
</worksheet>`
}

export async function exportRegistryToXlsx(
  entries: RegistryEntry[],
  firmRnsp: string
): Promise<void> {
  const ordered = [...entries].sort((a, b) => a.entryNumber - b.entryNumber)

  const zip = new JSZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES)
  zip.file('_rels/.rels', ROOT_RELS)
  zip.file('xl/workbook.xml', workbookXml('Libro-registro'))
  zip.file('xl/_rels/workbook.xml.rels', WORKBOOK_RELS)
  zip.file('xl/styles.xml', STYLES)
  zip.file('xl/worksheets/sheet1.xml', sheetXml(ordered))

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  })

  downloadBlob(blob, `libro-registro_${firmRnsp || 'despacho'}.xlsx`)
}

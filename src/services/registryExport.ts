import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { downloadBlob } from '@/lib/download'
import type { RegistryEntry } from '@/types'

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

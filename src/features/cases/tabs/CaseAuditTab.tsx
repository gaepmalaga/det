import type { Case } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CASE_STATUS_LABELS } from '@/constants/cases'

interface CaseAuditTabProps {
  caseData: Case
}

export function CaseAuditTab({ caseData }: CaseAuditTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Historial de estados</h3>
        <p className="text-xs text-slate-500">
          Registro completo de todos los cambios de estado del expediente.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Fecha y hora
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Motivo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...caseData.statusHistory].reverse().map((entry, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {CASE_STATUS_LABELS[entry.status]}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {format(entry.changedAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {entry.reason ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
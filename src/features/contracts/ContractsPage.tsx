import { useContracts } from '@/hooks/useContracts'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_LABELS = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  firmado: 'Firmado',
  rescindido: 'Rescindido',
}

const STATUS_COLORS = {
  borrador: 'bg-slate-50 text-slate-700 border-slate-200',
  enviado: 'bg-blue-50 text-blue-700 border-blue-200',
  firmado: 'bg-green-50 text-green-700 border-green-200',
  rescindido: 'bg-red-50 text-red-700 border-red-200',
}

export function ContractsPage() {
  const { contracts, loading } = useContracts()

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Todos los contratos del despacho."
      />

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin contratos"
          description="Los contratos se crean desde el detalle de cada expediente."
        />
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {c.clientName}
                    </p>
                    <span className="font-mono text-xs text-slate-400">
                      {c.contractNumber}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${STATUS_COLORS[c.status]}`}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-600 truncate mb-1">
                  {c.serviceDescription}
                </p>
                {c.agreedPrice && (
                  <p className="text-xs text-slate-500 mb-1">{c.agreedPrice}</p>
                )}
                <p className="text-xs text-slate-400">
                  {format(c.issuedAt, 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Referencia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Servicio
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {c.contractNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {c.clientName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <p className="truncate text-xs">{c.serviceDescription}</p>
                      {c.agreedPrice && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.agreedPrice}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[c.status]}`}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {format(c.issuedAt, 'dd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
import { useNavigate } from 'react-router-dom'
import { useClientPortal } from '@/hooks/usePortal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

export function PortalDashboard() {
  const { items, loading, error, hasAccess } = useClientPortal()
  const navigate = useNavigate()

  if (loading) return <LoadingSpinner />

  if (!hasAccess) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-slate-500">No tienes expedientes asociados a este email.</p>
      </div>
    )
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">Mis expedientes</h1>
        <p className="text-sm text-slate-500 mt-1">
          {items.length} expediente{items.length !== 1 ? 's' : ''} asociado{items.length !== 1 ? 's' : ''} a tu cuenta.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">Sin expedientes</p>
          <p className="text-sm text-slate-500">
            Cuando el despacho active tu acceso verás tus expedientes aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ case: c, quote }) => {
            const isOpen = !['cerrado', 'archivado'].includes(c.status)
            return (
              <div
                key={c.id}
                onClick={() => navigate('/portal/cases/' + c.id + '?firmId=' + c.firmId)}
                className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-400">{c.caseNumber}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          isOpen
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{c.investigationType}</p>
                    {c.investigationTypeCustom && (
                      <p className="text-xs text-slate-500">{c.investigationTypeCustom}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {quote && (
                      <p className="text-sm font-semibold text-slate-900">
                        {currencyFormatter.format(quote.amount)}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

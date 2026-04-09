import { useNavigate } from 'react-router-dom'
import { useClientPortal } from '@/hooks/usePortal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CaseStatusBadge } from '@/components/shared/StatusBadge'
import { FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function PortalDashboard() {
  const { cases, loading, error, hasAccess } = useClientPortal()
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
          {cases.length} expediente{cases.length !== 1 ? 's' : ''} asociado{cases.length !== 1 ? 's' : ''} a tu cuenta.
        </p>
      </div>

      {cases.length === 0 ? (
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
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate('/portal/cases/' + c.id + '?firmId=' + c.firmId)}
              className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-400">{c.caseNumber}</span>
                    <CaseStatusBadge status={c.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-900">{c.investigationType}</p>
                  {c.investigationTypeCustom && (
                    <p className="text-xs text-slate-500">{c.investigationTypeCustom}</p>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
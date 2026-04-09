import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Building2, Mail, Phone, FileText } from 'lucide-react'
import { useClientDetail } from '@/hooks/useClients'
import { useCases } from '@/hooks/useCases'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CaseStatusBadge } from '@/components/shared/StatusBadge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const { client, loading, error } = useClientDetail(clientId ?? '')
  const { cases } = useCases()

  if (loading) return <LoadingSpinner />
  if (error || !client) {
    return <p className="text-sm text-red-600">{error ?? 'No encontrado.'}</p>
  }

  const clientCases = cases.filter((c) => c.clientId === client.id)

  return (
    <div>
      <button
        onClick={() => navigate('/app/clients')}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a clientes
      </button>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          {client.clientType === 'corporate'
            ? <Building2 className="w-6 h-6 text-slate-500" />
            : <User className="w-6 h-6 text-slate-500" />
          }
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{client.legalName}</h1>
          {client.tradeName && (
            <p className="text-sm text-slate-500 mt-0.5">{client.tradeName}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {client.clientType === 'individual' ? 'Cliente particular' : 'Cliente corporativo'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Expedientes
            </h2>
            {clientCases.length === 0 ? (
              <p className="text-sm text-slate-400">No hay expedientes vinculados.</p>
            ) : (
              <div className="space-y-2">
                {clientCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate('/app/cases/' + c.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">{c.caseNumber}</span>
                        <CaseStatusBadge status={c.status} />
                      </div>
                      <p className="text-sm text-slate-900 mt-0.5">{c.investigationType}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Datos de contacto
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={'mailto:' + client.email} className="text-sm text-primary hover:underline truncate">{client.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={'tel:' + client.phone} className="text-sm text-slate-700">{client.phone}</a>
              </div>
              {client.taxId && (
                <div>
                  <p className="text-xs text-slate-500">NIF / CIF</p>
                  <p className="text-sm text-slate-700 uppercase">{client.taxId}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Información</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Cliente desde</p>
                <p className="text-sm text-slate-700">
                  {format(client.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Portal cliente</p>
                <p className="text-sm text-slate-700">
                  {client.portalAccessEnabled ? 'Acceso activo' : 'Sin acceso'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
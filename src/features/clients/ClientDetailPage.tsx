import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  FileText,
  MapPin,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react'
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
  const activeCases = clientCases.filter((c) =>
    ['revision', 'presupuesto', 'contrato_pendiente', 'activo', 'suspendido', 'trabajo_terminado'].includes(c.status)
  )
  const closedCases = clientCases.filter((c) =>
    ['cerrado', 'archivado'].includes(c.status)
  )

  return (
    <div>
      <button
        onClick={() => navigate('/app/clients')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a clientes
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {client.clientType === 'corporate'
            ? <Building2 className="w-6 h-6 text-muted-foreground" />
            : <User className="w-6 h-6 text-muted-foreground" />
          }
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">
            {client.legalName}
          </h1>
          {client.tradeName && (
            <p className="text-sm text-muted-foreground mt-0.5">{client.tradeName}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {client.clientType === 'individual'
              ? 'Cliente particular'
              : 'Cliente corporativo'}
          </p>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-semibold text-foreground">{clientCases.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total expedientes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-semibold text-foreground">{activeCases.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Activos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-semibold text-foreground">{closedCases.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Cerrados</p>
        </div>
      </div>

      {/* Layout: 1 col móvil, 3 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Columna principal — 2 cols en desktop */}
        <div className="lg:col-span-2 space-y-4">

          {/* Expedientes */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              Expedientes
              {clientCases.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {clientCases.length} en total
                </span>
              )}
            </h2>
            {clientCases.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No hay expedientes vinculados a este cliente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {clientCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate('/app/cases/' + c.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors active:bg-muted"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.caseNumber}
                        </span>
                        <CaseStatusBadge status={c.status} />
                      </div>
                      <p className="text-sm text-foreground truncate">
                        {c.investigationType}
                      </p>
                      {c.investigationTypeCustom && (
                        <p className="text-xs text-muted-foreground truncate">
                          {c.investigationTypeCustom}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 ml-3">
                      {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">

          {/* Datos de contacto */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Contacto
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                
<a href={'mailto:' + client.email} className="text-sm text-primary hover:underline truncate">
  {client.email}
</a>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  
<a href={'tel:' + client.phone} className="text-sm text-foreground">
  {client.phone}
</a>
                </div>
              )}
              {client.taxId && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {client.clientType === 'corporate' ? 'CIF' : 'NIF / NIE'}
                  </p>
                  <p className="text-sm text-foreground uppercase font-mono">
                    {client.taxId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dirección si existe */}
{(client as unknown as { address?: string }).address && (
  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
    <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
      <MapPin className="w-4 h-4 text-muted-foreground" />
      Dirección
    </h2>
    <p className="text-sm text-foreground whitespace-pre-wrap">
      {(client as unknown as { address?: string }).address}
    </p>
  </div>
)}

          {/* Portal cliente */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Portal cliente
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  client.portalAccessEnabled
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {client.portalAccessEnabled ? 'Acceso activo' : 'Sin acceso'}
              </span>
            </div>
            {client.portalAccessEnabled && (
              <p className="text-xs text-muted-foreground mt-2">
                El cliente puede acceder al portal con su cuenta de Google.
              </p>
            )}
            {!client.portalAccessEnabled && (
              <p className="text-xs text-muted-foreground mt-2">
                Activa el acceso desde el tab Portal en el expediente correspondiente.
              </p>
            )}
          </div>

          {/* Información general */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Información
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Cliente desde</p>
                <p className="text-sm text-foreground">
                  {format(client.createdAt, "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm text-foreground">
                  {client.clientType === 'individual'
                    ? 'Particular'
                    : 'Corporativo'}
                </p>
              </div>
              {client.convertedFromContactId && (
                <div>
                  <p className="text-xs text-muted-foreground">Origen</p>
                  <p className="text-sm text-foreground">
                    Convertido desde contacto
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
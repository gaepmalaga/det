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
  borrador: 'bg-muted text-foreground border-border',
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
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {c.clientName}
                    </p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.contractNumber}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${STATUS_COLORS[c.status]}`}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">
                  {c.serviceDescription}
                </p>
                {c.agreedPrice && (
                  <p className="text-xs text-muted-foreground mb-1">{c.agreedPrice}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(c.issuedAt, 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Referencia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Servicio
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-muted transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.contractNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.clientName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs">
                      <p className="truncate text-xs">{c.serviceDescription}</p>
                      {c.agreedPrice && (
                        <p className="text-xs text-muted-foreground mt-0.5">
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
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
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
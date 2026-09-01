import { useNavigate } from 'react-router-dom'
import { useCollaboratePortal } from '@/hooks/useCollaboratePortal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function CollaborateDashboard() {
  const { items, loading, error } = useCollaboratePortal()
  const navigate = useNavigate()

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Mis colaboraciones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} expediente{items.length !== 1 ? 's' : ''} donde colaboras.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Sin colaboraciones activas</p>
          <p className="text-sm text-muted-foreground">
            Cuando un despacho te asigne a un expediente, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ case: c, membership }) => {
            const isOpen = !['cerrado', 'archivado'].includes(c.status)
            return (
              <div
                key={c.firmId + c.id}
                onClick={() => navigate(`/collaborate/cases/${c.id}?firmId=${c.firmId}`)}
                className="bg-card border border-border rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary/20 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{c.caseNumber}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          isOpen
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{c.investigationType}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{membership.firmName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

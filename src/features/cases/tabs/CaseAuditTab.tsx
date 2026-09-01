import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCaseAuditLogs,
  getEventLabel,
  getEventColor,
  type AuditLog,
  type AuditEventType,
} from '@/services/auditLog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CASE_STATUS_LABELS } from '@/constants/cases'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ScrollText, Filter } from 'lucide-react'
import type { Case } from '@/types'

const EVENT_TYPE_GROUPS: { label: string; types: AuditEventType[] }[] = [
  {
    label: 'Expediente',
    types: ['case_created', 'case_status_changed'],
  },
  {
    label: 'Contratos',
    types: ['contract_created', 'contract_signed'],
  },
  {
    label: 'Actuaciones',
    types: ['action_added', 'action_deleted'],
  },
  {
    label: 'Evidencias',
    types: ['evidence_added', 'evidence_deleted'],
  },
  {
    label: 'Informes',
    types: ['report_created', 'report_approved', 'report_delivered'],
  },
  {
    label: 'Portal',
    types: [
      'portal_access_granted',
      'portal_access_revoked',
      'portal_document_released',
      'portal_message_sent',
    ],
  },
  {
    label: 'Registro',
    types: ['registry_entry_created', 'registry_entry_closed'],
  },
]

interface CaseAuditTabProps {
  caseData: Case
}

export function CaseAuditTab({ caseData }: CaseAuditTabProps) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AuditEventType | 'todos'>('todos')
  const [showFilter, setShowFilter] = useState(false)

  const load = useCallback(async () => {
    if (!user?.firmId) return
    setLoading(true)
    try {
      const data = await getCaseAuditLogs(user.firmId, caseData.id)
      setLogs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId, caseData.id])

  useEffect(() => {
    load()
  }, [load])

  const filtered = filter === 'todos'
    ? logs
    : logs.filter((l) => l.eventType === filter)

  // Combinar logs de Firestore con historial de estados del expediente
  // El historial de estados es la fuente de verdad para cambios de estado
  const statusEntries = [...caseData.statusHistory].reverse().map((entry) => ({
    id: 'status-' + entry.status + '-' + entry.changedAt.getTime(),
    type: 'status' as const,
    label: CASE_STATUS_LABELS[entry.status],
    detail: entry.reason,
    date: entry.changedAt,
    changedBy: entry.changedBy ?? '',
  }))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Auditoría del expediente</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro completo de todas las operaciones realizadas.
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filter !== 'todos'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground bg-card border-border hover:bg-muted'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {filter !== 'todos' ? getEventLabel(filter as AuditEventType) : 'Filtrar'}
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilter && (
        <div className="bg-muted border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-foreground mb-3">Filtrar por tipo de evento</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setFilter('todos'); setShowFilter(false) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filter === 'todos'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground bg-card border-border hover:bg-muted'
              }`}
            >
              Todos
            </button>
            {EVENT_TYPE_GROUPS.map((group) =>
              group.types.map((type) => (
                <button
                  key={type}
                  onClick={() => { setFilter(type); setShowFilter(false) }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    filter === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground bg-card border-border hover:bg-muted'
                  }`}
                >
                  {getEventLabel(type)}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Historial de estados del expediente */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Historial de estados
          </h4>
        </div>

        {/* Tabla en desktop */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Fecha y hora
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Motivo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {statusEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-medium text-foreground text-sm">
                    {entry.label}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(entry.date, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {entry.detail ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards en móvil */}
        <div className="md:hidden divide-y divide-border">
          {statusEntries.map((entry) => (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground">{entry.label}</p>
                <p className="text-xs text-muted-foreground">
                  {format(entry.date, 'dd MMM HH:mm', { locale: es })}
                </p>
              </div>
              {entry.detail && (
                <p className="text-xs text-muted-foreground">{entry.detail}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Logs de Firestore */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <ScrollText className="w-3.5 h-3.5" />
            Log de operaciones
          </h4>
          <span className="text-xs text-muted-foreground">
            {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {logs.length === 0
                ? 'Los eventos se registrarán aquí a medida que se realicen operaciones.'
                : 'No hay eventos con el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea de timeline */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-muted" />

            <div className="divide-y divide-border">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-4 py-4">
                  {/* Dot del timeline */}
                  <div className="relative flex items-center justify-center w-8 shrink-0 mt-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${getEventColor(log.eventType)} relative z-10`} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {getEventLabel(log.eventType)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.description}
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground"
                              >
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(log.createdAt, 'dd MMM HH:mm', { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-24">
                          {log.userName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
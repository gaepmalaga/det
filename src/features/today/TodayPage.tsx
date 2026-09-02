import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sun,
  PenLine,
  FileSignature,
  FileText,
  CircleCheck,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getRegistryEntries } from '@/services/registry'
import { getCaseActions } from '@/services/actions'
import { getContractsByCase } from '@/services/contracts'
import { getCaseReport } from '@/services/reports'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDistanceToNow, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RegistryEntry } from '@/types'

// Lo que un detective hace cada día es alimentar los asuntos que tiene
// abiertos. Esta pantalla es esa lista y nada más: qué está abierto, qué
// hace falta en cada uno y cuánto hace que no se toca — porque un asunto
// sin anotar durante días es el problema que nadie ve hasta que hay que
// redactar el informe y no queda de dónde sacarlo.
type NextStep = 'firmar' | 'anotar' | 'informe' | 'cerrar'

const STEP: Record<NextStep, { label: string; icon: React.ElementType; tab: string }> = {
  firmar: { label: 'Falta firmar el contrato', icon: FileSignature, tab: 'contrato' },
  anotar: { label: 'Anotar actuaciones', icon: PenLine, tab: 'actuaciones' },
  informe: { label: 'Redactar el informe', icon: FileText, tab: 'informe' },
  cerrar: { label: 'Listo para cerrar', icon: CircleCheck, tab: 'resumen' },
}

interface OpenCase {
  entry: RegistryEntry
  actionCount: number
  lastActivity: Date
  actionsToday: number
  step: NextStep
}

export function TodayPage() {
  const { user } = useAuth()
  const [cases, setCases] = useState<OpenCase[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.firmId) return
    const firmId = user.firmId
    setLoading(true)
    try {
      const entries = await getRegistryEntries(firmId)
      const open = entries.filter((e) => e.status === 'abierto' && e.caseId)

      const rows = await Promise.all(
        open.map(async (entry): Promise<OpenCase> => {
          const [actions, contracts, report] = await Promise.all([
            getCaseActions(firmId, entry.caseId),
            getContractsByCase(firmId, entry.caseId),
            getCaseReport(firmId, entry.caseId),
          ])

          const lastAction = actions[0]?.createdAt
          const signed = contracts.some((c) => c.status === 'firmado')

          // El siguiente paso es el primero que falta, no una lista de
          // tareas: en un asunto abierto solo hay una cosa que hacer ahora.
          const step: NextStep = !signed
            ? 'firmar'
            : actions.length === 0
              ? 'anotar'
              : !report
                ? 'informe'
                : 'cerrar'

          return {
            entry,
            actionCount: actions.length,
            lastActivity: lastAction ?? entry.startDate,
            actionsToday: actions.filter((a) => isToday(a.createdAt)).length,
            step,
          }
        })
      )

      // Lo más parado, arriba: es lo que se está olvidando.
      rows.sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime())
      setCases(rows)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId])

  useEffect(() => {
    load()
  }, [load])

  const annotatedToday = useMemo(
    () => cases.reduce((n, c) => n + c.actionsToday, 0),
    [cases]
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="pb-8">
      <PageHeader
        title="Hoy"
        description={
          cases.length === 0
            ? 'No hay ningún asunto abierto.'
            : `${cases.length} ${cases.length === 1 ? 'asunto abierto' : 'asuntos abiertos'}${
                annotatedToday > 0
                  ? ` · ${annotatedToday} ${annotatedToday === 1 ? 'actuación anotada' : 'actuaciones anotadas'} hoy`
                  : ' · nada anotado todavía hoy'
              }`
        }
      />

      {cases.length === 0 ? (
        <EmptyState
          icon={Sun}
          title="Nada abierto"
          description="Los asuntos aparecen aquí en cuanto se firma su contrato y se anotan en el libro."
        />
      ) : (
        <div className="space-y-2.5">
          {cases.map(({ entry, actionCount, lastActivity, actionsToday, step }) => {
            const info = STEP[step]
            const Icon = info.icon
            const stale =
              step === 'anotar' &&
              Date.now() - lastActivity.getTime() > 3 * 24 * 60 * 60 * 1000

            return (
              <Link
                key={entry.id}
                to={`/app/cases/${entry.caseId}?tab=${info.tab}`}
                className="block bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/40 hover:shadow transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded shrink-0 tabular-nums">
                    {String(entry.entryNumber).padStart(4, '0')}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">
                        {entry.clientName}
                      </p>
                      {entry.investigatedName && (
                        <p className="text-xs text-muted-foreground">
                          contra {entry.investigatedName}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {entry.investigationObject}
                    </p>

                    <div className="flex items-center gap-3 flex-wrap mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                          step === 'firmar'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : step === 'cerrar'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {info.label}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {actionsToday > 0
                          ? `${actionsToday} ${actionsToday === 1 ? 'anotación' : 'anotaciones'} hoy`
                          : `hace ${formatDistanceToNow(lastActivity, { locale: es })}`}
                      </span>

                      {actionCount > 0 && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {actionCount}{' '}
                          {actionCount === 1
                            ? 'actuación en total'
                            : 'actuaciones en total'}
                        </span>
                      )}

                      {stale && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertCircle className="w-3 h-3" />
                          sin anotar desde hace días
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Scale, Clock, HardDrive } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getRetentionQueue, type RetentionRow } from '@/services/compliance'
import { recordDestruction, RETENTION_LABELS } from '@/services/retention'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RetentionState } from '@/services/retention'

const STYLES: Record<string, string> = {
  vencido: 'bg-red-50 border-red-200 text-red-800',
  proximo: 'bg-amber-50 border-amber-200 text-amber-900',
  retenido: 'bg-blue-50 border-blue-200 text-blue-900',
  conservando: 'bg-card border-border text-foreground',
}

const ICONS: Partial<Record<RetentionState, React.ElementType>> = {
  vencido: Trash2,
  proximo: Clock,
  retenido: Scale,
  conservando: HardDrive,
}

// El art. 49.4 de la Ley 5/2014 obliga a destruir las imágenes y sonidos
// grabados tres años después de terminar la investigación, salvo que estén
// relacionados con un procedimiento judicial, policial o sancionador. Es la
// única obligación de conservación con fecha de caducidad: los informes
// tienen un mínimo de tres años, no un máximo.
//
// La plataforma no guarda las grabaciones —están en el disco o la tarjeta
// del detective— así que aquí no se borra nada: se avisa de qué toca
// destruir y se deja constancia de quién lo hizo y cuándo, que es lo que
// hay que poder enseñar.
export function RetentionQueue() {
  const { user } = useAuth()
  const [rows, setRows] = useState<RetentionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.firmId) return
    setLoading(true)
    try {
      setRows(await getRetentionQueue(user.firmId))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId])

  useEffect(() => {
    load()
  }, [load])

  const handleDestroyed = async (caseId: string) => {
    if (!user?.firmId) return
    setSaving(caseId)
    try {
      await recordDestruction(user.firmId, caseId, user.uid)
      await load()
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const due = rows.filter((r) => r.retention.state === 'vencido')

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Conservación del material grabado
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Las imágenes y sonidos se destruyen tres años después de terminar la
          investigación, salvo procedimiento judicial, policial o sancionador
          (art. 49.4 de la Ley 5/2014). Los informes, en cambio, tienen un
          mínimo de tres años, no un máximo: no hay que destruirlos.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">
          Ningún asunto tiene anotado material grabado pendiente. Se anota en
          cada expediente, en «Material grabado».
        </p>
      ) : (
        <>
          {due.length > 0 && (
            <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {due.length === 1
                ? 'Hay 1 asunto cuyo material debería estar destruido ya.'
                : `Hay ${due.length} asuntos cuyo material debería estar destruido ya.`}
            </p>
          )}

          <ul className="space-y-2">
            {rows.map((row) => {
              const Icon = ICONS[row.retention.state] ?? HardDrive
              return (
                <li
                  key={row.caseId}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${
                    STYLES[row.retention.state] ?? STYLES.conservando
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {row.entryNumber !== undefined && (
                        <Link
                          to={`/app/cases/${row.caseId}`}
                          className="font-mono text-xs font-semibold hover:underline"
                        >
                          Asiento {row.entryNumber}
                        </Link>
                      )}
                      <span className="text-sm font-medium">{row.clientName}</span>
                      <span className="text-xs opacity-80">
                        {RETENTION_LABELS[row.retention.state]}
                      </span>
                    </div>

                    <p className="text-xs opacity-80 mt-0.5">
                      {row.retention.dueDate && (
                        <>
                          Destrucción el{' '}
                          {format(row.retention.dueDate, "d 'de' MMMM 'de' yyyy", {
                            locale: es,
                          })}
                          {row.retention.state === 'vencido'
                            ? ` · vencida hace ${Math.abs(row.retention.daysLeft ?? 0)} días`
                            : row.retention.daysLeft !== null
                              ? ` · quedan ${row.retention.daysLeft} días`
                              : ''}
                        </>
                      )}
                    </p>

                    {row.location && (
                      <p className="text-xs opacity-70 mt-0.5">
                        Guardado en: {row.location}
                      </p>
                    )}
                    {row.retention.state === 'retenido' && (
                      <p className="text-xs opacity-80 mt-0.5">
                        Retenido: {row.exceptionReason || 'sin motivo anotado'}. No se
                        destruye mientras dure el procedimiento.
                      </p>
                    )}
                  </div>

                  {(row.retention.state === 'vencido' ||
                    row.retention.state === 'proximo') && (
                    <button
                      onClick={() => handleDestroyed(row.caseId)}
                      disabled={saving === row.caseId}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {saving === row.caseId ? 'Guardando...' : 'Ya destruido'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

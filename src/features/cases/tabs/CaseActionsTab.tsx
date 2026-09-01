import { useState, useRef, useEffect } from 'react'
import { Plus, Clock, MapPin, Trash2 } from 'lucide-react'
import { useCaseActions } from '@/hooks/useActions'
import { useCollaborators } from '@/hooks/useCollaborators'
import { useAuth } from '@/contexts/AuthContext'
import { createAuditLog } from '@/services/auditLog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { LocationPicker } from '@/features/cases/LocationPicker'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case } from '@/types'

interface CaseActionsTabProps {
  caseData: Case
}

export function CaseActionsTab({ caseData }: CaseActionsTabProps) {
  const { user } = useAuth()
  const { actions, loading, create, remove } = useCaseActions(caseData.id)
  const { collaborators } = useCollaborators()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [description, setDescription] = useState('')
  const [reportedBy, setReportedBy] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const assignedCollaborator = collaborators.find((c) => c.id === caseData.collaboratingFirmId)
  const canTagCollaboratorReport = !!assignedCollaborator && !assignedCollaborator.tienePlataforma

  useEffect(() => {
    if (!showForm) return
    textareaRef.current?.focus()
  }, [showForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !user.firmId) return
    setSubmitting(true)
    try {
      await create({
        description,
        locationLat: location?.lat,
        locationLng: location?.lng,
        detectiveId: user.uid,
        detectiveTip: '',
        reportedByCollaboratorId: reportedBy ? caseData.collaboratingFirmId : undefined,
      })

      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'action_added',
        'Actuación registrada'
      )

      setShowForm(false)
      setDescription('')
      setReportedBy(false)
      setLocation(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (actionId: string) => {
    if (!user || !user.firmId) return
    if (!confirm('¿Eliminar esta actuación?')) return
    try {
      await remove(actionId)

      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'action_deleted',
        'Actuación eliminada',
        { actionId }
      )
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <LoadingSpinner />

  const isClosed = caseData.status === 'cerrado' || caseData.status === 'archivado'
  const canAddActions = ['activo', 'suspendido', 'trabajo_terminado'].includes(caseData.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Actuaciones</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {actions.length} {actions.length === 1 ? 'actuación registrada' : 'actuaciones registradas'}
          </p>
        </div>
        {canAddActions && !isClosed && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva actuación
          </button>
        )}
      </div>

      {!canAddActions && !isClosed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            Las actuaciones solo pueden registrarse cuando el expediente está activo.
            Firma el contrato para activar el expediente.
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-muted border border-border rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-1">Captura rápida</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Fecha, hora y ubicación se registran automáticamente. Solo anota lo que estás viendo.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary bg-card"
              placeholder="¿Qué está ocurriendo ahora mismo?"
            />

            {canTagCollaboratorReport && (
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportedBy}
                  onChange={(e) => setReportedBy(e.target.checked)}
                />
                Reportado por {assignedCollaborator?.legalName} (no lo escribiste tú)
              </label>
            )}

            <LocationPicker onChange={setLocation} />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setDescription('')
                  setLocation(null)
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar actuación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {actions.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Sin actuaciones</p>
          <p className="text-xs text-muted-foreground">
            Registra las actuaciones realizadas durante la investigación.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <div
              key={action.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {format(action.createdAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {action.description}
                  </p>
                  {action.reportedByCollaboratorId && (
                    <p className="text-xs text-primary mt-1">
                      Reportado por {collaborators.find((c) => c.id === action.reportedByCollaboratorId)?.legalName ?? 'colaborador'}
                    </p>
                  )}
                  {action.locationLat !== undefined && action.locationLng !== undefined && (
                    <a
                      href={`https://www.google.com/maps?q=${action.locationLat},${action.locationLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                    >
                      <MapPin className="w-3 h-3" />
                      Ver ubicación
                    </a>
                  )}
                </div>
                {!isClosed && (
                  <button
                    onClick={() => handleRemove(action.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    aria-label="Eliminar actuación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

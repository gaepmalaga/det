import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, Loader2, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollaboratedCaseDetail } from '@/hooks/useCollaboratePortal'
import { getCaseActions, createAction } from '@/services/actions'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CaseAction } from '@/types'

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ok'; lat: number; lng: number }
  | { status: 'denied' }

export function CollaborateCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const [searchParams] = useSearchParams()
  const firmId = searchParams.get('firmId') ?? undefined
  const navigate = useNavigate()
  const { firebaseUser } = useAuth()
  const { caseData, loading, error } = useCollaboratedCaseDetail(firmId, caseId)

  const [actions, setActions] = useState<CaseAction[]>([])
  const [actionsLoading, setActionsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })

  const loadActions = useCallback(async () => {
    if (!firmId || !caseId) return
    setActionsLoading(true)
    try {
      const data = await getCaseActions(firmId, caseId)
      setActions(data)
    } finally {
      setActionsLoading(false)
    }
  }, [firmId, caseId])

  useEffect(() => {
    loadActions()
  }, [loadActions])

  useEffect(() => {
    if (!showForm || !('geolocation' in navigator)) return
    setLocation({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ status: 'ok', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [showForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firmId || !caseId || !firebaseUser) return
    setSubmitting(true)
    try {
      await createAction(firmId, caseId, firebaseUser.uid, {
        description,
        locationLat: location.status === 'ok' ? location.lat : undefined,
        locationLng: location.status === 'ok' ? location.lng : undefined,
        detectiveId: firebaseUser.uid,
        detectiveTip: '',
      })
      setDescription('')
      setLocation({ status: 'idle' })
      setShowForm(false)
      await loadActions()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error || !caseData) {
    return <p className="text-sm text-red-600">{error ?? 'Expediente no encontrado.'}</p>
  }

  return (
    <div>
      <button
        onClick={() => navigate('/collaborate')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a mis colaboraciones
      </button>

      <div className="mb-6">
        <span className="font-mono text-xs text-muted-foreground">{caseData.caseNumber}</span>
        <h1 className="text-xl font-semibold text-foreground mt-1">{caseData.investigationType}</h1>
        {caseData.description && (
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{caseData.description}</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Actuaciones</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva actuación
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-muted border border-border rounded-lg p-4 mb-4 space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary bg-card"
              placeholder="¿Qué está ocurriendo ahora mismo?"
            />
            {location.status === 'locating' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Obteniendo ubicación...
              </span>
            )}
            {location.status === 'ok' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                <MapPin className="w-3.5 h-3.5" />
                Ubicación capturada
              </span>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setDescription('') }}
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
        )}

        {actionsLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-6 h-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sin actuaciones todavía.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <div key={action.id} className="border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {format(action.createdAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{action.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

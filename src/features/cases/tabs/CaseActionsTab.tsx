import { useState } from 'react'
import { Plus, Clock, MapPin, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useCaseActions } from '@/hooks/useActions'
import { useAuth } from '@/contexts/AuthContext'
import { createAuditLog } from '@/services/auditLog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { RATE_TYPE_LABELS } from '@/constants/cases'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case, RateType } from '@/types'

interface ActionFormData {
  date: string
  startTime: string
  endTime: string
  rateType: RateType
  location: string
  description: string
}

interface CaseActionsTabProps {
  caseData: Case
}

export function CaseActionsTab({ caseData }: CaseActionsTabProps) {
  const { user } = useAuth()
  const { actions, loading, create, remove, totalHours } = useCaseActions(caseData.id)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<ActionFormData>({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '14:00',
    rateType: 'diurna',
    location: '',
    description: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const previewHours = (() => {
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    if (diff <= 0) return 0
    return Math.round((diff / 60) * 100) / 100
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !user.firmId) return
    setSubmitting(true)
    try {
      await create({
        date: new Date(form.date + 'T12:00:00'),
        startTime: form.startTime,
        endTime: form.endTime,
        rateType: form.rateType,
        location: form.location,
        description: form.description,
        detectiveId: user.uid,
        detectiveTip: '',
      })

      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'action_added',
        `Actuación registrada el ${form.date}: ${previewHours}h en ${form.location}`,
        {
          date: form.date,
          hours: String(previewHours),
          rateType: form.rateType,
          location: form.location,
        }
      )

      setShowForm(false)
      setForm({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '14:00',
        rateType: 'diurna',
        location: '',
        description: '',
      })
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
          <h3 className="text-sm font-semibold text-slate-900">Actuaciones</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {actions.length} actuaciones · {totalHours.toFixed(1)} horas totales
          </p>
        </div>
        {canAddActions && !isClosed && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Nueva actuación</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Tipo de tarifa
                </label>
                <select
                  name="rateType"
                  value={form.rateType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  {Object.entries(RATE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Hora inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Hora fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Horas (calculado)
                </label>
                <div className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-medium">
                  {previewHours > 0 ? `${previewHours}h` : '—'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Lugar <span className="text-red-500">*</span>
              </label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Dirección o descripción del lugar"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
                placeholder="Describe las actuaciones realizadas..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || previewHours <= 0}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar actuación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {actions.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">Sin actuaciones</p>
          <p className="text-xs text-slate-500">
            Registra las actuaciones realizadas durante la investigación.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <div
              key={action.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-center shrink-0 min-w-[40px]">
                    <p className="text-xs font-semibold text-slate-900">
                      {format(action.date, 'dd', { locale: es })}
                    </p>
                    <p className="text-xs text-slate-500 uppercase">
                      {format(action.date, 'MMM', { locale: es })}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">
                        {action.startTime} — {action.endTime}
                      </span>
                      <span className="text-xs font-medium text-slate-900">
                        {action.hoursWorked}h
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {RATE_TYPE_LABELS[action.rateType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{action.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {!isClosed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(action.id)
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {expandedId === action.id
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                </div>
              </div>

              {expandedId === action.id && (
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Descripción</p>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {action.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
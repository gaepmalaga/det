import { useState } from 'react'
import { FileText, Plus, CheckCircle, Send, AlertTriangle, Sparkles } from 'lucide-react'
import { useCaseReport } from '@/hooks/useReports'
import { useCaseActions } from '@/hooks/useActions'
import { useAuth } from '@/contexts/AuthContext'
import { createAuditLog } from '@/services/auditLog'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { closeRegistryEntry } from '@/services/registry'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case, CaseAction } from '@/types'

function compileActionsText(actions: CaseAction[]): string {
  const chronological = [...actions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )
  return chronological
    .map((a) => {
      const when = format(a.createdAt, "dd/MM/yyyy HH:mm", { locale: es })
      const location =
        a.locationLat !== undefined && a.locationLng !== undefined
          ? ` (ubicación: ${a.locationLat.toFixed(5)}, ${a.locationLng.toFixed(5)})`
          : ''
      return `[${when}]${location} ${a.description}`
    })
    .join('\n\n')
}

const REPORT_STATUS_LABELS = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  entregado: 'Entregado',
  archivado: 'Archivado',
}

const REPORT_STATUS_COLORS = {
  borrador: 'bg-slate-50 text-slate-700 border-slate-200',
  en_revision: 'bg-amber-50 text-amber-700 border-amber-200',
  aprobado: 'bg-blue-50 text-blue-700 border-blue-200',
  entregado: 'bg-green-50 text-green-700 border-green-200',
  archivado: 'bg-slate-50 text-slate-500 border-slate-200',
}

interface CaseReportTabProps {
  caseData: Case
  onCaseUpdated: () => void
}

export function CaseReportTab({ caseData, onCaseUpdated }: CaseReportTabProps) {
  const { user } = useAuth()
  const { report, loading, create, update, approve, deliver } = useCaseReport(caseData.id)
  const { actions: caseActions } = useCaseActions(caseData.id)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deliveredTo, setDeliveredTo] = useState('')
  const [showDeliverForm, setShowDeliverForm] = useState(false)

  const [form, setForm] = useState({
    clientName: '',
    clientTaxId: '',
    serviceObject: caseData.objectScope || caseData.description,
    methodsUsed: '',
    results: '',
    actionsPerformed: '',
    conclusions: '',
    observations: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !user.firmId) return
    setSubmitting(true)
    try {
      await create({
        caseNumber: caseData.caseNumber,
        clientName: form.clientName,
        clientTaxId: form.clientTaxId || undefined,
        serviceObject: form.serviceObject,
        methodsUsed: form.methodsUsed,
        results: form.results,
        detectives: [{
          detectiveId: caseData.assignedDetectiveId,
          detectiveName: user.displayName || '',
          detectiveTip: caseData.assignedDetectiveTip || '',
        }],
        actionsPerformed: form.actionsPerformed,
        conclusions: form.conclusions || undefined,
        observations: form.observations || undefined,
      })

      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'report_created',
        'Informe de investigación creado'
      )

      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!report) return
    setSubmitting(true)
    try {
      await update(report.id, {
        clientName: form.clientName,
        clientTaxId: form.clientTaxId || undefined,
        serviceObject: form.serviceObject,
        methodsUsed: form.methodsUsed,
        results: form.results,
        actionsPerformed: form.actionsPerformed,
        conclusions: form.conclusions || undefined,
        observations: form.observations || undefined,
      })
      setEditing(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!report || !user || !user.firmId) return
    setSubmitting(true)
    try {
      await approve(report.id)

      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'report_approved',
        'Informe aprobado'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeliver = async () => {
    if (!report || !user || !user.firmId) return
    if (!deliveredTo.trim()) return
    setSubmitting(true)
    try {
      await deliver(report.id, deliveredTo.trim())

      // Cierre automático del expediente
      await updateDoc(doc(db, 'firms', user.firmId, 'cases', caseData.id), {
        status: 'cerrado',
        closedAt: serverTimestamp(),
        closedBy: user.uid,
        reportSentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Cerrar asiento en libro-registro
      if (caseData.registryEntryId) {
        await closeRegistryEntry(user.firmId, caseData.registryEntryId)
      }

      // Audit log de entrega
      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'report_delivered',
        'Informe entregado a ' + deliveredTo.trim()
      )

      setShowDeliverForm(false)
      onCaseUpdated()
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = () => {
    if (!report) return
    setForm({
      clientName: report.clientName,
      clientTaxId: report.clientTaxId,
      serviceObject: report.serviceObject,
      methodsUsed: report.methodsUsed,
      results: report.results,
      actionsPerformed: report.actionsPerformed,
      conclusions: report.conclusions || '',
      observations: report.observations || '',
    })
    setEditing(true)
  }

  if (loading) return <LoadingSpinner />

  const isClosed = caseData.status === 'cerrado' || caseData.status === 'archivado'
  const canCreateReport = ['activo', 'suspendido', 'trabajo_terminado'].includes(caseData.status)

  if (!report && !showForm) {
    return (
      <div className="space-y-6">
        {!canCreateReport && !isClosed && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              El informe solo puede redactarse cuando el expediente está activo.
              Firma el contrato para activar el expediente.
            </p>
          </div>
        )}

        {isClosed && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-400">Expediente cerrado sin informe registrado.</p>
          </div>
        )}

        {canCreateReport && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">Sin informe</p>
            <p className="text-xs text-slate-500 mb-4">
              Redacta el informe de investigación. Al entregarlo el expediente se cerrará automáticamente.
            </p>
            <button
              onClick={() => {
                setForm((prev) => ({ ...prev, serviceObject: caseData.objectScope || caseData.description }))
                setShowForm(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Redactar informe
            </button>
          </div>
        )}
      </div>
    )
  }

  if (showForm || editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {editing ? 'Editar informe' : 'Nuevo informe de investigación'}
          </h3>
          <button
            onClick={() => { setShowForm(false); setEditing(false) }}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Campos obligatorios por ley (art. 49.1 Ley 5/2014): número de registro,
            datos del contratante, objeto, medios, resultados, detectives intervinientes
            y actuaciones realizadas.
          </p>
        </div>

        <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nombre del contratante <span className="text-red-500">*</span>
              </label>
              <input
                name="clientName"
                value={form.clientName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Nombre completo del cliente"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                NIF / NIE del contratante
              </label>
              <input
                name="clientTaxId"
                value={form.clientTaxId}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                placeholder="12345678A"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Objeto de la contratación <span className="text-red-500">*</span>
            </label>
            <textarea
              name="serviceObject"
              value={form.serviceObject}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Describe el objeto de la investigación contratada..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Medios utilizados <span className="text-red-500">*</span>
            </label>
            <textarea
              name="methodsUsed"
              value={form.methodsUsed}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Describe los medios técnicos y humanos empleados..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Actuaciones realizadas <span className="text-red-500">*</span>
              </label>
              {caseActions.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      actionsPerformed: compileActionsText(caseActions),
                    }))
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Compilar {caseActions.length} actuaciones
                </button>
              )}
            </div>
            <textarea
              name="actionsPerformed"
              value={form.actionsPerformed}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Describe cronológicamente las actuaciones realizadas durante la investigación..."
            />
            {caseActions.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                "Compilar" ordena cronológicamente las actuaciones registradas en la pestaña
                Actuaciones. Revisa y redacta el texto en lenguaje de informe antes de guardar.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Resultados obtenidos <span className="text-red-500">*</span>
            </label>
            <textarea
              name="results"
              value={form.results}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Describe los resultados y hallazgos de la investigación..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Conclusiones{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              name="conclusions"
              value={form.conclusions}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Conclusiones del detective..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Observaciones{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              name="observations"
              value={form.observations}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(false) }}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear informe'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (report) {
    return (
      <div className="space-y-6">
        {/* Header del informe */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-slate-400">{report.registryNumber}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${REPORT_STATUS_COLORS[report.status]}`}>
                {REPORT_STATUS_LABELS[report.status]}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Informe de investigación</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Creado el {format(report.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {report.status === 'borrador' && !isClosed && (
              <>
                <button
                  onClick={startEditing}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-3 h-3" />
                  Aprobar
                </button>
              </>
            )}
            {report.status === 'aprobado' && !isClosed && (
              <button
                onClick={() => setShowDeliverForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send className="w-3 h-3" />
                Entregar al cliente
              </button>
            )}
          </div>
        </div>

        {/* Formulario de entrega */}
        {showDeliverForm && (
          <div className="bg-white border border-green-200 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Confirmar entrega del informe
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Al confirmar la entrega el expediente se cerrará automáticamente
              y quedará bloqueado para edición.
            </p>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Entregado a <span className="text-red-500">*</span>
              </label>
              <input
                value={deliveredTo}
                onChange={(e) => setDeliveredTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Nombre del receptor del informe"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeliverForm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeliver}
                disabled={submitting || !deliveredTo.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Procesando...' : 'Confirmar entrega y cerrar expediente'}
              </button>
            </div>
          </div>
        )}

        {/* Contenido del informe */}
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Datos del contratante
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Nombre</p>
                <p className="text-sm text-slate-900 font-medium">{report.clientName}</p>
              </div>
              {report.clientTaxId && (
                <div>
                  <p className="text-xs text-slate-500">NIF / NIE</p>
                  <p className="text-sm text-slate-900 uppercase">{report.clientTaxId}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Detectives intervinientes
            </p>
            <div className="space-y-2">
              {report.detectives.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-600 font-medium shrink-0">
                    {d.detectiveName[0]}
                  </div>
                  <div>
                    <p className="text-sm text-slate-900">{d.detectiveName}</p>
                    {d.detectiveTip && (
                      <p className="text-xs text-slate-500 font-mono">TIP: {d.detectiveTip}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Objeto de la contratación
            </p>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{report.serviceObject}</p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Medios utilizados
            </p>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{report.methodsUsed}</p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Actuaciones realizadas
            </p>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{report.actionsPerformed}</p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Resultados obtenidos
            </p>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{report.results}</p>
          </div>

          {report.conclusions && (
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                Conclusiones
              </p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{report.conclusions}</p>
            </div>
          )}

          {report.observations && (
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                Observaciones
              </p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{report.observations}</p>
            </div>
          )}

          {report.deliveredAt && (
            <div className="p-5 bg-green-50">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
                Entrega registrada
              </p>
              <p className="text-sm text-green-900">
                Entregado a <strong>{report.deliveredTo}</strong> el{' '}
                {format(report.deliveredAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
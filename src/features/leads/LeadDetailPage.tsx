import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  FolderPlus,
} from 'lucide-react'
import { useLeadDetail } from '@/hooks/useLeads'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { LeadStatusBadge } from '@/components/shared/StatusBadge'
import { ConvertToCaseDialog } from './ConvertToCaseDialog'
import { ROUTES } from '@/constants/routes'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { lead, loading, error, changeStatus } = useLeadDetail(leadId ?? '')
  const [showConvert, setShowConvert] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [updating, setUpdating] = useState(false)

  if (loading) return <LoadingSpinner />
  if (error || !lead) {
    return <p className="text-sm text-red-600">{error ?? 'No encontrado.'}</p>
  }

  const isNew = lead.status === 'nuevo'
  const isInReview = lead.status === 'en_revision'
  const isAccepted = lead.status === 'aceptado'
  const isRejected = lead.status === 'rechazado'

  const canAccept = isNew || isInReview
  const canReject = !isRejected && !isAccepted
  const canConvert = isAccepted

  const handleAccept = async () => {
    setUpdating(true)
    await changeStatus('aceptado')
    setUpdating(false)
  }

  const handleReject = async () => {
    setUpdating(true)
    await changeStatus('rechazado', { rejectionReason })
    setShowRejectForm(false)
    setUpdating(false)
  }

  const handleSetInReview = async () => {
    setUpdating(true)
    await changeStatus('en_revision')
    setUpdating(false)
  }

  return (
    <div>
      <button
        onClick={() => navigate(ROUTES.LEADS)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a solicitudes
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs text-slate-400">
              {lead.referenceNumber}
            </span>
            <LeadStatusBadge status={lead.status} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            {lead.contactName}
          </h1>
          {lead.companyName && (
            <p className="text-sm text-slate-500 mt-0.5">{lead.companyName}</p>
          )}
        </div>

        <div className="flex gap-2">
          {isNew && (
            <button
              onClick={handleSetInReview}
              disabled={updating}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Iniciar revisión
            </button>
          )}
          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={updating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {updating ? 'Actualizando...' : 'Aceptar'}
            </button>
          )}
          {canConvert && (
            <button
              onClick={() => setShowConvert(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Crear expediente
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={updating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Encargo solicitado
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">
                  Tipo de investigación
                </p>
                <p className="text-sm text-slate-900">
                  {lead.investigationType}
                  {lead.investigationTypeCustom && (
                    <span className="text-slate-500 ml-1">
                      — {lead.investigationTypeCustom}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Descripción</p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {lead.description}
                </p>
              </div>
            </div>
          </div>

          {lead.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-amber-900 mb-2">
                Notas internas
              </h2>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">
                {lead.notes}
              </p>
            </div>
          )}

          {isRejected && lead.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-red-900 mb-2">
                Motivo de rechazo
              </h2>
              <p className="text-sm text-red-800">{lead.rejectionReason}</p>
            </div>
          )}

          {showRejectForm && (
            <div className="bg-white border border-red-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Motivo del rechazo
              </h2>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-3"
                placeholder="Indica el motivo del rechazo (opcional)..."
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  disabled={updating}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={updating}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Procesando...' : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Contacto
            </h2>
            <div className="space-y-3">
<div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={'mailto:' + lead.contactEmail} className="text-sm text-primary hover:underline truncate">{lead.contactEmail}</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={'tel:' + lead.contactPhone} className="text-sm text-slate-700">{lead.contactPhone}</a>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tipo</p>
                <p className="text-sm text-slate-700">
                  {lead.contactType === 'individual' ? 'Particular' : 'Empresa'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Información
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Fecha de entrada</p>
                <p className="text-sm text-slate-700">
                  {format(lead.createdAt, "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Última actualización</p>
                <p className="text-sm text-slate-700">
                  {format(lead.updatedAt, "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConvertToCaseDialog
        open={showConvert}
        lead={lead}
        onClose={() => setShowConvert(false)}
        onConverted={(caseId) => navigate('/app/cases/' + caseId)}
      />
    </div>
  )
}
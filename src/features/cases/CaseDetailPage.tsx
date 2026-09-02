import { useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Handshake } from 'lucide-react'
import { useCaseDetail, useCases } from '@/hooks/useCases'
import { useCollaborators } from '@/hooks/useCollaborators'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CaseStatusBadge } from '@/components/shared/StatusBadge'
import { CaseContractTab } from './tabs/CaseContractTab'
import { CaseActionsTab } from './tabs/CaseActionsTab'
import { CaseReportTab } from './tabs/CaseReportTab'
import { CaseAuditTab } from './tabs/CaseAuditTab'
import { CasePortalTab } from './tabs/CasePortalTab'
import { ROUTES } from '@/constants/routes'
import { CASE_STATUS_LABELS, CASE_STATUS_FLOW, COMPLIANCE_LABELS } from '@/constants/cases'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CaseStatus } from '@/types'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'contrato', label: 'Contrato' },
  { id: 'actuaciones', label: 'Actuaciones' },
  { id: 'informe', label: 'Informe' },
  { id: 'portal', label: 'Portal cliente' },
  { id: 'auditoria', label: 'Auditoría' },
]

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { caseData, loading, error, reload: reloadDetail } = useCaseDetail(caseId ?? '')
  const { changeStatus, update, reload } = useCases()
  const { collaborators } = useCollaborators()
  // La pestaña va en la URL para poder enlazar directamente a ella: desde
  // Hoy se entra a anotar una actuación, no al resumen del expediente.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const activeTab = TABS.some((t) => t.id === requested) ? requested! : 'resumen'
  const setActiveTab = (tab: string) =>
    setSearchParams(tab === 'resumen' ? {} : { tab }, { replace: true })
  const [changingStatus, setChangingStatus] = useState(false)

const handleCaseUpdated = useCallback(() => {
  reload()
  setTimeout(() => {
    reloadDetail()
  }, 500)
}, [reload, reloadDetail])

  if (loading) return <LoadingSpinner />
  if (error || !caseData) {
    return <p className="text-sm text-red-600">{error ?? 'No encontrado.'}</p>
  }

  const nextStatuses = CASE_STATUS_FLOW[caseData.status] ?? []

  const handleStatusChange = async (newStatus: CaseStatus) => {
    setChangingStatus(true)
    await changeStatus(caseData.id, newStatus)
    setChangingStatus(false)
  }

  const handleCollaboratorChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await update(caseData.id, { collaboratingFirmId: e.target.value || null })
    reloadDetail()
  }

  return (
    <div>
      <button
        onClick={() => navigate(ROUTES.CASES)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a expedientes
      </button>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">
                {caseData.caseNumber}
              </span>
              <CaseStatusBadge status={caseData.status} />
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${
                  caseData.complianceStatus === 'green'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : caseData.complianceStatus === 'amber'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {COMPLIANCE_LABELS[caseData.complianceStatus]}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {caseData.investigationType}
            </h1>
            {caseData.investigationTypeCustom && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {caseData.investigationTypeCustom}
              </p>
            )}
          </div>
        </div>

        {/* Botones de cambio de estado — flex wrap en móvil */}
        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={changingStatus}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                  s === 'rechazado'
                    ? 'text-red-600 border-red-200 hover:bg-red-50'
                    : s === 'cerrado'
                    ? 'text-primary-foreground bg-primary border-primary hover:bg-primary/90'
                    : 'text-foreground border-border bg-card hover:bg-muted'
                }`}
              >
                {CASE_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs — scroll horizontal en móvil */}
      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Columna principal — 2 cols en desktop */}
          <div className="lg:col-span-2 space-y-4">

            {caseData.complianceIssues.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Alertas de cumplimiento
                </h3>
                <ul className="space-y-1.5">
                  {caseData.complianceIssues.map((issue, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">Encargo</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Objeto y alcance</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {caseData.objectScope || (
                      <span className="text-muted-foreground italic">Sin definir</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Interés legítimo
                    {caseData.legitimateInterestValidated && (
                      <span className="text-green-600 text-xs ml-2">✓ Validado</span>
                    )}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {caseData.legitimateInterest || (
                      <span className="text-muted-foreground italic">Sin documentar</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {caseData.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Investigado</p>
                    <p className="text-sm text-foreground">
                      {caseData.investigatedName || (
                        <span className="text-muted-foreground italic">Sin definir</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Domicilio del investigado</p>
                    <p className="text-sm text-foreground">
                      {caseData.investigatedAddress || (
                        <span className="text-muted-foreground italic">Sin definir</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Historial de estados
              </h3>
              <div className="space-y-3">
                {[...caseData.statusHistory].reverse().map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">
                        {CASE_STATUS_LABELS[entry.status]}
                      </p>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground">{entry.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(entry.changedAt, "dd MMM yyyy 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna lateral */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Información
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Apertura</p>
                  <p className="text-sm text-foreground">
                    {format(caseData.createdAt, "dd 'de' MMMM 'de' yyyy", {
                      locale: es,
                    })}
                  </p>
                </div>
                {caseData.conservationDeadline && (
                  <div>
                    <p className="text-xs text-muted-foreground">Conservación hasta</p>
                    <p className="text-sm text-foreground">
                      {format(
                        caseData.conservationDeadline,
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </p>
                  </div>
                )}
                {caseData.registryEntryNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nº libro-registro</p>
                    <p className="text-sm font-mono text-foreground">
                      {caseData.registryEntryNumber}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Handshake className="w-4 h-4 text-muted-foreground" />
                Colaborador asignado
              </h3>
              <select
                value={caseData.collaboratingFirmId ?? ''}
                onChange={handleCollaboratorChange}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
              >
                <option value="">Sin colaborador</option>
                {collaborators
                  .filter((c) => c.status === 'activo')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName}{c.tienePlataforma ? ' (con acceso a la plataforma)' : ''}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                {caseData.collaboratingFirmId
                  ? collaborators.find((c) => c.id === caseData.collaboratingFirmId)?.tienePlataforma
                    ? 'Este colaborador puede ver y añadir actuaciones en este expediente.'
                    : 'Sin cuenta propia — puedes marcar sus actuaciones como reportadas por él en la pestaña Actuaciones.'
                  : 'Sin colaborador, este expediente lo trabaja tu despacho en exclusiva.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contrato' && (
        <CaseContractTab caseData={caseData} onCaseUpdated={handleCaseUpdated} />
      )}

      {activeTab === 'actuaciones' && (
        <CaseActionsTab caseData={caseData} />
      )}

      {activeTab === 'informe' && (
        <CaseReportTab caseData={caseData} onCaseUpdated={handleCaseUpdated} />
      )}

      {activeTab === 'portal' && (
        <CasePortalTab caseData={caseData} />
      )}

      {activeTab === 'auditoria' && (
        <CaseAuditTab caseData={caseData} />
      )}
    </div>
  )
}
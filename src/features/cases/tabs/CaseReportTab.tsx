import { useState, useEffect } from 'react'
import { useCaseReport } from '@/hooks/useReports'
import { useCaseActions } from '@/hooks/useActions'
import { useClientDetail } from '@/hooks/useClients'
import { useFirm } from '@/hooks/useFirm'
import { useAuth } from '@/contexts/AuthContext'
import { createAuditLog } from '@/services/auditLog'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { closeRegistryEntry } from '@/services/registry'
import { generateReportDraft } from '@/services/aiReport'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ReportEmptyState } from './report/ReportEmptyState'
import { ReportForm } from './report/ReportForm'
import { ReportView } from './report/ReportView'
import { compileActionsText, faltanEnInforme, type ReportFormState } from './report/utils'
import type { Case } from '@/types'

interface CaseReportTabProps {
  caseData: Case
  onCaseUpdated: () => void
}

export function CaseReportTab({ caseData, onCaseUpdated }: CaseReportTabProps) {
  const { user } = useAuth()
  const { firm } = useFirm()
  const { report, loading, create, update, approve, deliver } = useCaseReport(caseData.id)
  const { actions: caseActions } = useCaseActions(caseData.id)
  const { client } = useClientDetail(caseData.clientId || '')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deliveredTo, setDeliveredTo] = useState('')
  const [showDeliverForm, setShowDeliverForm] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [draftGenerated, setDraftGenerated] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)

  const [form, setForm] = useState<ReportFormState>({
    clientName: '',
    clientTaxId: '',
    serviceObject: caseData.objectScope || caseData.description,
    methodsUsed: '',
    results: '',
    actionsPerformed: '',
    conclusions: '',
    observations: '',
  })

  // El expediente ya sabe quién es el cliente (Case.clientId) — evita que
  // el detective tenga que volver a teclear un nombre y NIF que la
  // plataforma ya tiene, tanto al redactar a mano como en el borrador de IA.
  useEffect(() => {
    if (report || !client) return
    setForm((prev) => ({
      ...prev,
      clientName: prev.clientName || client.legalName,
      clientTaxId: prev.clientTaxId || client.taxId,
    }))
  }, [client, report])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(false)
    setDraftGenerated(false)
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
      setDraftGenerated(false)
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
    const faltan = faltanEnInforme(report)
    if (faltan.length > 0) {
      setApproveError(
        `Antes de aprobarlo falta ${faltan.join(', ')}. Un informe aprobado dice que está terminado.`
      )
      return
    }
    setApproveError(null)
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

  const handleGenerateDraft = async () => {
    if (generatingDraft || caseActions.length === 0) return
    setDraftError(null)
    setGeneratingDraft(true)
    try {
      const draft = await generateReportDraft({
        caseNumber: caseData.caseNumber,
        investigationType: caseData.investigationTypeCustom || caseData.investigationType,
        objectScope: caseData.objectScope || caseData.description,
        investigatedName: caseData.investigatedName,
        investigatedAddress: caseData.investigatedAddress,
        actionsText: compileActionsText(caseActions),
      })
      setForm((prev) => ({
        ...prev,
        serviceObject: prev.serviceObject || caseData.objectScope || caseData.description,
        methodsUsed: draft.methodsUsed,
        actionsPerformed: draft.actionsPerformed,
        results: draft.results,
        conclusions: draft.conclusions,
      }))
      setDraftGenerated(true)
      setShowForm(true)
    } catch (err) {
      console.error(err)
      setDraftError(
        err instanceof Error ? err.message : 'No se pudo generar el borrador. Redáctalo a mano.'
      )
    } finally {
      setGeneratingDraft(false)
    }
  }

  const handleExportPdf = async () => {
    if (!report || !firm || exportingPdf) return
    setExportingPdf(true)
    try {
      const { exportReportToPdf } = await import('@/services/reportExport')
      exportReportToPdf(report, firm)
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportDocx = async () => {
    if (!report || !firm || exportingDocx) return
    setExportingDocx(true)
    try {
      const { exportReportToDocx } = await import('@/services/reportExport')
      await exportReportToDocx(report, firm)
    } finally {
      setExportingDocx(false)
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
      <ReportEmptyState
        canCreateReport={canCreateReport}
        isClosed={isClosed}
        hasActions={caseActions.length > 0}
        generatingDraft={generatingDraft}
        draftError={draftError}
        onRedactar={() => {
          setForm((prev) => ({ ...prev, serviceObject: caseData.objectScope || caseData.description }))
          setShowForm(true)
        }}
        onGenerateDraft={handleGenerateDraft}
      />
    )
  }

  if (showForm || editing) {
    return (
      <ReportForm
        editing={editing}
        form={form}
        caseActions={caseActions}
        submitting={submitting}
        draftGenerated={draftGenerated}
        onChange={handleChange}
        onCompileActions={(text) => setForm((prev) => ({ ...prev, actionsPerformed: text }))}
        onSubmit={editing ? handleUpdate : handleCreate}
        onCancel={closeForm}
      />
    )
  }

  if (report) {
    return (
      <ReportView
        report={report}
        firm={firm}
        isClosed={isClosed}
        submitting={submitting}
        approveError={approveError}
        exportingPdf={exportingPdf}
        exportingDocx={exportingDocx}
        showDeliverForm={showDeliverForm}
        deliveredTo={deliveredTo}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
        onStartEditing={startEditing}
        onApprove={handleApprove}
        onShowDeliverForm={() => setShowDeliverForm(true)}
        onHideDeliverForm={() => setShowDeliverForm(false)}
        onDeliveredToChange={setDeliveredTo}
        onDeliver={handleDeliver}
      />
    )
  }

  return null
}

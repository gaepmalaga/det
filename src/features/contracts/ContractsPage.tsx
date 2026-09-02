import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContracts } from '@/hooks/useContracts'
import { useAuth } from '@/contexts/AuthContext'
import { openCaseFromContract } from '@/services/caseOpening'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SignContractDialog } from './SignContractDialog'
import { FileText, CheckCircle, Link as LinkIcon, FolderOpen, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ROUTES } from '@/constants/routes'
import type { Contract } from '@/services/contracts'

const STATUS_LABELS = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  firmado: 'Firmado',
  rescindido: 'Rescindido',
}

const STATUS_COLORS = {
  borrador: 'bg-muted text-foreground border-border',
  enviado: 'bg-blue-50 text-blue-700 border-blue-200',
  firmado: 'bg-green-50 text-green-700 border-green-200',
  rescindido: 'bg-red-50 text-red-700 border-red-200',
}

export function ContractsPage() {
  const { contracts, loading, sign, uploadDocument, reload } = useContracts()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const copySignLink = async (contractId: string) => {
    if (!user?.firmId) return
    const url = `${window.location.origin}/sign/${user.firmId}/${contractId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(contractId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSign = async (contractId: string, signedByName: string, signatureDataUrl: string | null) => {
    if (!user?.firmId) return
    setError(null)
    try {
      await sign(contractId, signedByName, signatureDataUrl)
      const caseId = await openCaseFromContract(user.firmId, user.uid, contractId)
      setSelectedContract(null)
      navigate(ROUTES.CASE_DETAIL.replace(':caseId', caseId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al abrir el expediente.')
    }
  }

  const handleOpenCase = async (contractId: string) => {
    if (!user?.firmId) return
    setError(null)
    setOpeningId(contractId)
    try {
      const caseId = await openCaseFromContract(user.firmId, user.uid, contractId)
      navigate(ROUTES.CASE_DETAIL.replace(':caseId', caseId))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al abrir el expediente.')
      setOpeningId(null)
    }
  }

  const handleUpload = async (contractId: string, file: File) => {
    await uploadDocument(contractId, file)
    await reload()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Todos los contratos del despacho. Al firmarse, se abre automáticamente el expediente."
      />

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin contratos"
          description="Los contratos se crean al aceptar un presupuesto o desde el detalle de un expediente."
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.contractNumber}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[c.status]}`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <p className="font-medium text-foreground truncate">{c.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.serviceDescription}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {c.agreedPrice && (
                      <span className="text-xs text-muted-foreground">{c.agreedPrice}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(c.issuedAt, 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap">
                  {c.sourceDocumentUrl && (
                    <a
                      href={c.sourceDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
                    >
                      Ver PDF subido
                    </a>
                  )}
                  {c.scannedDocumentUrl && (
                    <a
                      href={c.scannedDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
                    >
                      Ver documento
                    </a>
                  )}
                  {c.caseId ? (
                    <button
                      onClick={() => navigate(ROUTES.CASE_DETAIL.replace(':caseId', c.caseId as string))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Ver expediente
                    </button>
                  ) : c.status === 'firmado' ? (
                    <button
                      onClick={() => handleOpenCase(c.id)}
                      disabled={openingId === c.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {openingId === c.id ? 'Abriendo...' : 'Abrir expediente'}
                    </button>
                  ) : c.status !== 'rescindido' ? (
                    <>
                      <button
                        onClick={() => copySignLink(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {copiedId === c.id ? 'Copiado' : 'Copiar enlace de firma'}
                      </button>
                      <button
                        onClick={() => setSelectedContract(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Registrar firma manual
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedContract && (
        <SignContractDialog
          open={true}
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onSign={(name, sig) => handleSign(selectedContract.id, name, sig)}
          onUploadDocument={(file) => handleUpload(selectedContract.id, file)}
        />
      )}
    </div>
  )
}

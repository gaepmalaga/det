import { useState } from 'react'
import { Plus, FileText, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react'
import { useCaseContracts } from '@/hooks/useContracts'
import { createRegistryEntry } from '@/services/registry'
import { createAuditLog } from '@/services/auditLog'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ContractForm } from '@/features/contracts/ContractForm'
import { SignContractDialog } from '@/features/contracts/SignContractDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case } from '@/types'
import type { Contract, CreateContractData } from '@/services/contracts'

const CONTRACT_STATUS_LABELS = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  firmado: 'Firmado',
  rescindido: 'Rescindido',
}

const CONTRACT_STATUS_COLORS = {
  borrador: 'bg-muted text-foreground border-border',
  enviado: 'bg-blue-50 text-blue-700 border-blue-200',
  firmado: 'bg-green-50 text-green-700 border-green-200',
  rescindido: 'bg-red-50 text-red-700 border-red-200',
}

interface CaseContractTabProps {
  caseData: Case
  onCaseUpdated: () => void
}

export function CaseContractTab({ caseData, onCaseUpdated }: CaseContractTabProps) {
  const { user } = useAuth()
  const { contracts, loading, create, sign, uploadDocument } = useCaseContracts(caseData.id)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [expandedBodyId, setExpandedBodyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const handleCreate = async (data: CreateContractData) => {
    await create(data)
    setShowCreate(false)
  }

  const handleSign = async (contractId: string, signedByName: string) => {
    if (!user || !user.firmId) return

    await sign(contractId, signedByName)

    try {
      const firmDoc = await getDoc(doc(db, 'firms', user.firmId))
      const firmData = firmDoc.data()

      let clientName = 'Sin cliente'
      let clientTaxId = ''
      let clientType: 'individual' | 'corporate' = 'individual'

      if (caseData.clientId) {
        const clientDoc = await getDoc(doc(db, 'firms', user.firmId, 'clients', caseData.clientId))
        if (clientDoc.exists()) {
          const clientData = clientDoc.data()
          clientName = clientData.legalName as string
          clientTaxId = (clientData.taxId as string) || ''
          clientType = clientData.clientType as 'individual' | 'corporate'
        }
      }

      const memberDoc = await getDoc(doc(db, 'firms', user.firmId, 'members', caseData.assignedDetectiveId))
      const memberData = memberDoc.exists() ? memberDoc.data() : null

      const detectiveTip = caseData.assignedDetectiveTip || (memberData?.tipNumber as string) || ''

      const entryId = await createRegistryEntry(user.firmId, user.uid, {
        firmRnsp: (firmData?.rnsp as string) || '',
        clientName,
        clientTaxId,
        clientType,
        investigationObject: caseData.objectScope || caseData.description,
        investigatedName: caseData.investigatedName,
        investigatedAddress: caseData.investigatedAddress,
        detectiveName: (memberData?.displayName as string) || user.displayName || '',
        detectiveTip,
        caseId: caseData.id,
        caseNumber: caseData.caseNumber,
      })

      await updateDoc(doc(db, 'firms', user.firmId, 'cases', caseData.id), {
        status: 'activo',
        registryEntryId: entryId,
        complianceStatus: 'green',
        complianceIssues: [],
        updatedAt: serverTimestamp(),
      })

      // Audit log al final, cuando todo ha ido bien
      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'contract_signed',
        'Contrato firmado por ' + signedByName,
        { contractId, signedBy: signedByName }
      )

      onCaseUpdated()
    } catch (err) {
      console.error('Error al activar expediente:', err)
    }
  }

  const handleUpload = async (contractId: string, file: File) => {
    await uploadDocument(contractId, file)
  }

  if (loading) return <LoadingSpinner />

  const isClosed = caseData.status === 'cerrado' || caseData.status === 'archivado'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Contratos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Al firmar el contrato el expediente pasará automáticamente a activo.
          </p>
        </div>
        {!isClosed && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo contrato
          </button>
        )}
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Sin contratos</p>
          <p className="text-xs text-muted-foreground mb-4">
            Crea el contrato de prestación de servicios para este expediente.
          </p>
          {!isClosed && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear contrato
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      {contract.contractNumber}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${CONTRACT_STATUS_COLORS[contract.status]}`}>
                      {CONTRACT_STATUS_LABELS[contract.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{contract.clientName}</p>
                </div>

                <div className="flex gap-2">
                  {contract.scannedDocumentUrl && (
                    <a href={contract.scannedDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      Ver documento
                    </a>
                  )}
                  {contract.status !== 'firmado' && contract.status !== 'rescindido' && !isClosed && (
                    <>
                      <button
                        onClick={() => copySignLink(contract.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {copiedId === contract.id ? 'Copiado' : 'Copiar enlace de firma'}
                      </button>
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Registrar firma manual
                      </button>
                    </>
                  )}
                  {contract.status === 'firmado' && (
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
                    >
                      Ver firma
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">{contract.serviceDescription}</p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {contract.agreedPrice && (
                  <div>
                    <p className="text-muted-foreground">Precio acordado</p>
                    <p className="text-foreground font-medium">{contract.agreedPrice}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Emisión</p>
                  <p className="text-foreground">
                    {format(contract.issuedAt, 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                {contract.signedAt && (
                  <div>
                    <p className="text-muted-foreground">Fecha de firma</p>
                    <p className="text-foreground">
                      {format(contract.signedAt, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                )}
                {contract.signedByName && (
                  <div>
                    <p className="text-muted-foreground">Firmado por</p>
                    <p className="text-foreground">{contract.signedByName}</p>
                  </div>
                )}
                {contract.signedIp && (
                  <div>
                    <p className="text-muted-foreground">IP de firma</p>
                    <p className="text-foreground font-mono">{contract.signedIp}</p>
                  </div>
                )}
              </div>

              {contract.specificConditions && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Condiciones específicas</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap">
                    {contract.specificConditions}
                  </p>
                </div>
              )}

              {contract.bodyText && (
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() =>
                      setExpandedBodyId(expandedBodyId === contract.id ? null : contract.id)
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-foreground transition-colors"
                  >
                    {expandedBodyId === contract.id ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    Ver texto del contrato
                  </button>
                  {expandedBodyId === contract.id && (
                    <p className="text-xs text-foreground whitespace-pre-wrap mt-2 p-3 bg-muted rounded-lg font-mono">
                      {contract.bodyText}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ContractForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        defaultServiceDescription={caseData.objectScope || caseData.description}
        caseId={caseData.id}
        clientId={caseData.clientId}
      />

      {selectedContract && (
        <SignContractDialog
          open={true}
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onSign={(name) => handleSign(selectedContract.id, name)}
          onUploadDocument={(file) => handleUpload(selectedContract.id, file)}
        />
      )}
    </div>
  )
}
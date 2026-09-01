import { useState } from 'react'
import { Plus, FileText, CheckCircle, ExternalLink } from 'lucide-react'
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
  borrador: 'bg-slate-50 text-slate-700 border-slate-200',
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
          <h3 className="text-sm font-semibold text-slate-900">Contratos</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Al firmar el contrato el expediente pasará automáticamente a activo.
          </p>
        </div>
        {!isClosed && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo contrato
          </button>
        )}
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">Sin contratos</p>
          <p className="text-xs text-slate-500 mb-4">
            Crea el contrato de prestación de servicios para este expediente.
          </p>
          {!isClosed && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear contrato
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-400">
                      {contract.contractNumber}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${CONTRACT_STATUS_COLORS[contract.status]}`}>
                      {CONTRACT_STATUS_LABELS[contract.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{contract.clientName}</p>
                </div>

                <div className="flex gap-2">
                  {contract.scannedDocumentUrl && (
                    <a href={contract.scannedDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      Ver documento
                    </a>
                  )}
                  {contract.status !== 'firmado' && contract.status !== 'rescindido' && !isClosed && (
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Firmar
                    </button>
                  )}
                  {contract.status === 'firmado' && (
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Ver firma
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3">{contract.serviceDescription}</p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {contract.agreedPrice && (
                  <div>
                    <p className="text-slate-500">Precio acordado</p>
                    <p className="text-slate-900 font-medium">{contract.agreedPrice}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500">Emisión</p>
                  <p className="text-slate-900">
                    {format(contract.issuedAt, 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                {contract.signedAt && (
                  <div>
                    <p className="text-slate-500">Fecha de firma</p>
                    <p className="text-slate-900">
                      {format(contract.signedAt, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                )}
                {contract.signedByName && (
                  <div>
                    <p className="text-slate-500">Firmado por</p>
                    <p className="text-slate-900">{contract.signedByName}</p>
                  </div>
                )}
              </div>

              {contract.specificConditions && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Condiciones específicas</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                    {contract.specificConditions}
                  </p>
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
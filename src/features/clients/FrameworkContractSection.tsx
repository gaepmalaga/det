import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCheck, Upload, FilePlus2, Ban } from 'lucide-react'
import { useFrameworkContract } from '@/hooks/useFrameworkContracts'
import { CreateFrameworkCaseDialog } from './CreateFrameworkCaseDialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Client } from '@/types'

interface FrameworkContractSectionProps {
  client: Client
}

export function FrameworkContractSection({ client }: FrameworkContractSectionProps) {
  const navigate = useNavigate()
  const { contract, loading, upload, deactivate } = useFrameworkContract(client.frameworkContractId)
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNewCase, setShowNewCase] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isActive = contract?.status === 'activo'

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await upload(client.id, file, notes || undefined)
      setNotes('')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileCheck className="w-4 h-4 text-muted-foreground" />
        Contrato marco
      </h2>

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : isActive && contract ? (
        <div className="space-y-3">
          <div>
            <a
              href={contract.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {contract.fileName}
            </a>
            <p className="text-xs text-muted-foreground mt-1">
              Subido el {format(contract.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
            {contract.notes && (
              <p className="text-xs text-muted-foreground mt-1">{contract.notes}</p>
            )}
          </div>

          <button
            onClick={() => setShowNewCase(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FilePlus2 className="w-4 h-4" />
            Nuevo expediente
          </button>

          <button
            onClick={deactivate}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors"
          >
            <Ban className="w-3.5 h-3.5" />
            Desactivar contrato marco
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Sin contrato marco activo. Los expedientes de este cliente pasan por
            presupuesto individual hasta que subas uno.
          </p>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota (opcional)"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelected}
            disabled={uploading}
            className="hidden"
            id="framework-contract-upload"
          />
          <label
            htmlFor="framework-contract-upload"
            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-muted/70 transition-colors cursor-pointer ${
              uploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Subiendo...' : 'Subir contrato marco (PDF)'}
          </label>
        </div>
      )}

      <CreateFrameworkCaseDialog
        open={showNewCase}
        client={client}
        onClose={() => setShowNewCase(false)}
        onCreated={(caseId) => {
          setShowNewCase(false)
          navigate('/app/cases/' + caseId)
        }}
      />
    </div>
  )
}

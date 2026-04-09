import { useState, useRef } from 'react'
import { X, Upload, CheckCircle } from 'lucide-react'
import type { Contract } from '@/services/contracts'

interface SignContractDialogProps {
  open: boolean
  contract: Contract
  onClose: () => void
  onSign: (signedByName: string) => Promise<void>
  onUploadDocument: (file: File) => Promise<void>
}

export function SignContractDialog({
  open,
  contract,
  onClose,
  onSign,
  onUploadDocument,
}: SignContractDialogProps) {
  const [signedByName, setSignedByName] = useState('')
  const [signing, setSigning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(
    contract.scannedDocumentName ?? null
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSign = async () => {
    if (!signedByName.trim()) return
    setSigning(true)
    try {
      await onSign(signedByName.trim())
      onClose()
    } finally {
      setSigning(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUploadDocument(file)
      setUploadedFile(file.name)
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  const isSigned = contract.status === 'firmado'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {isSigned ? 'Contrato firmado' : 'Firmar contrato'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isSigned ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Contrato firmado</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Firmado por: {contract.signedByName}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-medium text-slate-700 mb-1">Contrato</p>
                <p className="text-sm text-slate-900">{contract.contractNumber}</p>
                <p className="text-xs text-slate-500 mt-1">{contract.serviceDescription}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nombre del firmante <span className="text-red-500">*</span>
                </label>
                <input
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Nombre completo del firmante"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Nombre de la persona que firma el contrato en representación del cliente.
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">
              Documento firmado{' '}
              <span className="text-slate-400 font-normal">(PDF escaneado)</span>
            </p>
            {uploadedFile ? (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-slate-700 truncate">{uploadedFile}</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="ml-auto text-xs text-slate-500 hover:text-slate-700 shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Subiendo...' : 'Subir documento firmado'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {!isSigned && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSign}
                disabled={signing || !signedByName.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {signing ? 'Firmando...' : 'Confirmar firma'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
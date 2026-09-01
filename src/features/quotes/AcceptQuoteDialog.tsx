import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { useQuotes } from '@/hooks/useQuotes'
import { useAuth } from '@/contexts/AuthContext'
import { createClient, getClientByContactId } from '@/services/clients'
import { setQuoteContract } from '@/services/quotes'
import { createContract, uploadContractSourceDocument } from '@/services/contracts'
import { ContractForm } from '@/features/contracts/ContractForm'
import { SYSTEM_INVESTIGATION_TYPES } from '@/types'
import type { CreateContractData } from '@/services/contracts'
import type { Contact, Quote } from '@/types'

interface AcceptQuoteDialogProps {
  open: boolean
  quote: Quote
  contact: Contact
  onClose: () => void
  onDone: (contractId: string) => void
}

// Paso 1: datos legales del futuro expediente (no se crea todavía — el
// expediente se abre solo cuando el contrato quede firmado, ver
// services/caseOpening.ts). Paso 2: el contrato en sí, reutilizando el
// mismo formulario que se usa desde Contratos.
export function AcceptQuoteDialog({
  open,
  quote,
  contact,
  onClose,
  onDone,
}: AcceptQuoteDialogProps) {
  const { accept } = useQuotes()
  const { user } = useAuth()
  const [step, setStep] = useState<'legal' | 'contract'>('legal')
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [form, setForm] = useState({
    objectScope: '',
    legitimateInterest: '',
    investigatedName: '',
    investigatedAddress: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmitLegal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !user?.firmId) return
    setLoading(true)
    try {
      // Si este contacto ya tiene cliente (de una investigación anterior),
      // se reutiliza — no se crea una ficha duplicada en cada presupuesto.
      const existingClient = await getClientByContactId(user.firmId, contact.id)
      const newClientId = existingClient
        ? existingClient.id
        : await createClient(user.firmId, user.uid, {
            clientType: contact.contactType,
            legalName: contact.contactType === 'corporate' && contact.companyName
              ? contact.companyName
              : contact.contactName,
            tradeName: contact.contactType === 'corporate' && contact.companyName
              ? contact.contactName
              : undefined,
            email: contact.contactEmail,
            phone: contact.contactPhone,
            convertedFromContactId: contact.id,
          })

      await accept(quote.id, {
        clientId: newClientId,
        objectScope: form.objectScope,
        legitimateInterest: form.legitimateInterest,
        investigatedName: form.investigatedName,
        investigatedAddress: form.investigatedAddress,
        assignedDetectiveId: user.uid,
        assignedDetectiveTip: '',
      })

      setClientId(newClientId)
      setStep('contract')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContract = async (data: CreateContractData, sourceFile: File | null) => {
    if (!user?.firmId) return
    const contractId = await createContract(user.firmId, user.uid, data)
    await setQuoteContract(user.firmId, quote.id, contractId)
    if (sourceFile) {
      await uploadContractSourceDocument(user.firmId, contractId, sourceFile)
    }
    onDone(contractId)
  }

  if (!open) return null

  if (step === 'contract' && clientId) {
    return (
      <ContractForm
        open
        onClose={onClose}
        onCreate={handleCreateContract}
        defaultServiceDescription={quote.description}
        defaultAgreedPrice={quote.amount ? String(quote.amount) : ''}
        clientId={clientId}
        quoteId={quote.id}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Aceptar presupuesto
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitLegal} className="p-6 space-y-4">
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Se creará una ficha de cliente y, en el siguiente paso, el
              contrato para firmar. El expediente se abrirá solo cuando el
              contrato quede firmado.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Tipo de investigación
            </label>
            <select
              disabled
              value={quote.investigationType}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted text-muted-foreground"
            >
              {SYSTEM_INVESTIGATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Del presupuesto — no se puede cambiar aquí.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Objeto y alcance del encargo <span className="text-red-500">*</span>
            </label>
            <textarea
              name="objectScope"
              value={form.objectScope}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Define con precisión el objeto de la investigación y su alcance..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Interés legítimo <span className="text-red-500">*</span>
            </label>
            <textarea
              name="legitimateInterest"
              value={form.legitimateInterest}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Documenta el interés legítimo que justifica la investigación..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Requisito legal. Debe quedar acreditado antes de iniciar la investigación.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Investigado <span className="text-red-500">*</span>
              </label>
              <input
                name="investigatedName"
                value={form.investigatedName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Nombre y apellidos o razón social"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Domicilio/localidad <span className="text-red-500">*</span>
              </label>
              <input
                name="investigatedAddress"
                value={form.investigatedAddress}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Del investigado"
              />
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground -mt-1">
              Requisito legal para el libro-registro (Anexo VII).
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Continuar al contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { X, FileCheck } from 'lucide-react'
import { useCases } from '@/hooks/useCases'
import { useAuth } from '@/contexts/AuthContext'
import { SYSTEM_INVESTIGATION_TYPES } from '@/types'
import type { Client } from '@/types'

interface CreateFrameworkCaseDialogProps {
  open: boolean
  client: Client
  onClose: () => void
  onCreated: (caseId: string) => void
}

export function CreateFrameworkCaseDialog({
  open,
  client,
  onClose,
  onCreated,
}: CreateFrameworkCaseDialogProps) {
  const { create } = useCases()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    investigationType: '',
    description: '',
    objectScope: '',
    legitimateInterest: '',
    investigatedName: '',
    investigatedAddress: '',
    agreedAmount: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !user) return
    setLoading(true)
    try {
      const caseId = await create({
        investigationType: form.investigationType,
        description: form.description,
        objectScope: form.objectScope,
        legitimateInterest: form.legitimateInterest,
        investigatedName: form.investigatedName,
        investigatedAddress: form.investigatedAddress,
        assignedDetectiveId: user.uid,
        assignedDetectiveTip: '',
        clientId: client.id,
        billingMode: 'framework',
        agreedAmount: form.agreedAmount ? parseFloat(form.agreedAmount) : undefined,
      })
      if (caseId) onCreated(caseId)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Nuevo expediente — contrato marco
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3 p-3 bg-primary/5 border border-primary/15 rounded-lg">
            <FileCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              {client.legalName} tiene un contrato marco activo — este expediente se
              abre directamente, sin pasar por un presupuesto.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Tipo de investigación <span className="text-red-500">*</span>
            </label>
            <select
              name="investigationType"
              value={form.investigationType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Seleccionar...</option>
              {SYSTEM_INVESTIGATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Importe acordado para este asunto
              <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="agreedAmount"
                value={form.agreedAmount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 pr-8 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                €
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Solo para control interno — las condiciones económicas ya están
              pactadas en el contrato marco.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Descripción
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
            />
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
              {loading ? 'Creando...' : 'Crear expediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

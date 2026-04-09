import { useState } from 'react'
import { X } from 'lucide-react'
import type { CreateContractData, ContractType } from '@/services/contracts'

interface ContractFormProps {
  open: boolean
  onClose: () => void
  onCreate: (data: CreateContractData) => Promise<void>
  defaultClientName?: string
  defaultServiceDescription?: string
  caseId?: string
  clientId?: string
}

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  servicio_cliente: 'Prestación de servicios',
  marco_colaboracion: 'Marco de colaboración',
  marco_corporativo: 'Marco corporativo',
}

export function ContractForm({
  open,
  onClose,
  onCreate,
  defaultClientName = '',
  defaultServiceDescription = '',
  caseId,
  clientId,
}: ContractFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'servicio_cliente' as ContractType,
    clientName: defaultClientName,
    serviceDescription: defaultServiceDescription,
    agreedPrice: '',
    specificConditions: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onCreate({
        type: form.type,
        clientName: form.clientName,
        serviceDescription: form.serviceDescription,
        agreedPrice: form.agreedPrice || undefined,
        specificConditions: form.specificConditions || undefined,
        caseId,
        clientId,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Nuevo contrato</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tipo de contrato
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Cliente <span className="text-red-500">*</span>
            </label>
            <input
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Nombre del cliente o empresa"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Descripción del servicio <span className="text-red-500">*</span>
            </label>
            <textarea
              name="serviceDescription"
              value={form.serviceDescription}
              onChange={handleTextareaChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Describe el servicio contratado..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Precio acordado{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              name="agreedPrice"
              value={form.agreedPrice}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Ej: 1.200€ — Vigilancia 3 días"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Condiciones específicas{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              name="specificConditions"
              value={form.specificConditions}
              onChange={handleTextareaChange}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Condiciones particulares del contrato..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
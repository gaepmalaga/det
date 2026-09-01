import { useState } from 'react'
import { X } from 'lucide-react'
import { SYSTEM_INVESTIGATION_TYPES } from '@/types'
import type { Contact } from '@/types'
import type { CreateQuoteData } from '@/services/quotes'

interface CreateQuoteDialogProps {
  open: boolean
  contacts: Contact[]
  lockedContactId?: string
  onClose: () => void
  onCreate: (data: CreateQuoteData) => Promise<void>
}

export function CreateQuoteDialog({
  open,
  contacts,
  lockedContactId,
  onClose,
  onCreate,
}: CreateQuoteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    contactId: lockedContactId ?? '',
    investigationType: '',
    investigationTypeCustom: '',
    description: '',
    amount: '',
  })

  const lockedContact = lockedContactId
    ? contacts.find((c) => c.id === lockedContactId)
    : undefined

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contactId) return
    setLoading(true)
    try {
      await onCreate({
        contactId: form.contactId,
        investigationType: form.investigationType,
        investigationTypeCustom: form.investigationTypeCustom || undefined,
        description: form.description,
        amount: Number(form.amount),
      })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Nuevo presupuesto
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Contacto <span className="text-red-500">*</span>
            </label>
            {lockedContact ? (
              <div className="px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                {lockedContact.contactName}
                {lockedContact.companyName && (
                  <span className="text-slate-400"> — {lockedContact.companyName}</span>
                )}
              </div>
            ) : (
              <select
                name="contactId"
                value={form.contactId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Seleccionar contacto...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contactName}
                    {c.companyName ? ` — ${c.companyName}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tipo de investigación <span className="text-red-500">*</span>
            </label>
            <select
              name="investigationType"
              value={form.investigationType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Seleccionar tipo...</option>
              {SYSTEM_INVESTIGATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Detalle adicional{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              name="investigationTypeCustom"
              value={form.investigationTypeCustom}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Especifica si es necesario..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Descripción del encargo <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Describe brevemente qué necesita investigar el cliente..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Importe (€) <span className="text-red-500">*</span>
            </label>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="0,00"
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
              {loading ? 'Enviando...' : 'Enviar presupuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

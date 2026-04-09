import { useState } from 'react'
import { X } from 'lucide-react'
import { SYSTEM_INVESTIGATION_TYPES } from '@/types'
import type { CreateLeadData } from '@/services/leads'

interface CreateLeadDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (data: CreateLeadData) => Promise<void>
}

export function CreateLeadDialog({
  open,
  onClose,
  onCreate,
}: CreateLeadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CreateLeadData>({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactType: 'individual',
    companyName: '',
    investigationType: '',
    investigationTypeCustom: '',
    description: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
        ...form,
        companyName: form.companyName || undefined,
        investigationTypeCustom: form.investigationTypeCustom || undefined,
        notes: form.notes || undefined,
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Nueva solicitud
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Tipo de contacto */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tipo de contacto
            </label>
            <select
              name="contactType"
              value={form.contactType}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="individual">Particular</option>
              <option value="corporate">Empresa / Corporativo</option>
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nombre del contacto <span className="text-red-500">*</span>
            </label>
            <input
              name="contactName"
              value={form.contactName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Nombre y apellidos"
            />
          </div>

          {/* Empresa */}
          {form.contactType === 'corporate' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Empresa
              </label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Nombre de la empresa"
              />
            </div>
          )}

          {/* Email y teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                name="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="600 000 000"
              />
            </div>
          </div>

          {/* Tipo de investigación */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tipo de investigación <span className="text-red-500">*</span>
            </label>
            <select
              name="investigationType"
              value={form.investigationType}
              onChange={handleSelectChange}
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

          {/* Detalle libre */}
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

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Descripción del encargo <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleTextareaChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Describe brevemente qué necesita investigar el cliente..."
            />
          </div>

          {/* Notas internas */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Notas internas{' '}
              <span className="text-slate-400 font-normal">
                (no visibles al cliente)
              </span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleTextareaChange}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Notas para el equipo..."
            />
          </div>

          {/* Actions */}
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
              {loading ? 'Creando...' : 'Crear solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
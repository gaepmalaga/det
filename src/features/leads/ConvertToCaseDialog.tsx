import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { useCases } from '@/hooks/useCases'
import { useAuth } from '@/contexts/AuthContext'
import { SYSTEM_INVESTIGATION_TYPES } from '@/types'
import type { Lead } from '@/types'

interface ConvertToCaseDialogProps {
  open: boolean
  lead: Lead
  onClose: () => void
  onConverted: (caseId: string) => void
}

export function ConvertToCaseDialog({
  open,
  lead,
  onClose,
  onConverted,
}: ConvertToCaseDialogProps) {
  const { create } = useCases()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    investigationType: lead.investigationType,
    investigationTypeCustom: lead.investigationTypeCustom ?? '',
    description: lead.description,
    objectScope: '',
    legitimateInterest: '',
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const caseId = await create({
        ...form,
        investigationTypeCustom: form.investigationTypeCustom || undefined,
        assignedDetectiveId: user.uid,
        assignedDetectiveTip: '',
        leadId: lead.id,
      })
      if (caseId) onConverted(caseId)
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
            Crear expediente desde solicitud
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Aviso */}
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Al crear el expediente se generará un asiento en el libro-registro
              cuando el contrato esté firmado y el expediente pase a activo.
            </p>
          </div>

          {/* Tipo */}
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
              <option value="">Seleccionar...</option>
              {SYSTEM_INVESTIGATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Detalle */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Detalle adicional
            </label>
            <input
              name="investigationTypeCustom"
              value={form.investigationTypeCustom}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Objeto y alcance */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Objeto y alcance del encargo <span className="text-red-500">*</span>
            </label>
            <textarea
              name="objectScope"
              value={form.objectScope}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Define con precisión el objeto de la investigación y su alcance..."
            />
          </div>

          {/* Interés legítimo */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Interés legítimo <span className="text-red-500">*</span>
            </label>
            <textarea
              name="legitimateInterest"
              value={form.legitimateInterest}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Documenta el interés legítimo que justifica la investigación..."
            />
            <p className="text-xs text-slate-400 mt-1">
              Requisito legal. Debe quedar acreditado antes de iniciar la investigación.
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Descripción
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
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
              {loading ? 'Creando...' : 'Crear expediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
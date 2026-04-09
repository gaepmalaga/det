import { useState, useEffect } from 'react'
import { useFirm } from '@/hooks/useFirm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Plus, X, Save } from 'lucide-react'
import { SYSTEM_INVESTIGATION_TYPES } from '@/types'

export function InvestigationTypesTab() {
  const { firm, loading, updateInvestigationTypes } = useFirm()
  const [customTypes, setCustomTypes] = useState<string[]>([])
  const [newType, setNewType] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!firm) return
    setCustomTypes(firm.customInvestigationTypes ?? [])
  }, [firm])

  const handleAdd = () => {
    const trimmed = newType.trim()
    if (!trimmed || customTypes.includes(trimmed)) return
    setCustomTypes((prev) => [...prev, trimmed])
    setNewType('')
  }

  const handleRemove = (type: string) => {
    setCustomTypes((prev) => prev.filter((t) => t !== type))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateInvestigationTypes(customTypes)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Tipos predefinidos del sistema
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Estos tipos están disponibles para todos los despachos y no pueden modificarse.
        </p>
        <div className="flex flex-wrap gap-2">
          {SYSTEM_INVESTIGATION_TYPES.map((type) => (
            <span
              key={type}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Tipos personalizados del despacho
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Añade tipos específicos de tu despacho. Aparecerán junto a los predefinidos
          al crear solicitudes y expedientes.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Nuevo tipo de investigación..."
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newType.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Añadir
          </button>
        </div>

        {customTypes.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
            No hay tipos personalizados. Añade el primero.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-6">
            {customTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {type}
                <button
                  onClick={() => handleRemove(type)}
                  className="text-primary/60 hover:text-primary transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar tipos'}
          </button>
          {saved && (
            <p className="text-sm text-green-600">Tipos guardados correctamente.</p>
          )}
        </div>
      </div>
    </div>
  )
}
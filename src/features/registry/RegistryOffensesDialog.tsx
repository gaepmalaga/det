import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { amendRegistryEntry } from '@/services/registry'
import { useAuth } from '@/contexts/AuthContext'
import type { RegistryEntry } from '@/types'

interface RegistryOffensesDialogProps {
  open: boolean
  entry: RegistryEntry
  onClose: () => void
  onSaved: () => void
}

export function RegistryOffensesDialog({
  open,
  entry,
  onClose,
  onSaved,
}: RegistryOffensesDialogProps) {
  const { user } = useAuth()
  const [knownOffenses, setKnownOffenses] = useState(entry.knownOffenses)
  const [offensesReportedTo, setOffensesReportedTo] = useState(entry.offensesReportedTo)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || !user?.firmId) return
    setSaving(true)
    try {
      if (knownOffenses !== entry.knownOffenses) {
        await amendRegistryEntry(
          user.firmId,
          entry.id,
          user.uid,
          'knownOffenses',
          entry.knownOffenses,
          knownOffenses,
          'Actualización de delitos perseguibles de oficio conocidos'
        )
      }
      if (offensesReportedTo !== entry.offensesReportedTo) {
        await amendRegistryEntry(
          user.firmId,
          entry.id,
          user.uid,
          'offensesReportedTo',
          entry.offensesReportedTo,
          offensesReportedTo,
          'Actualización del órgano al que se comunicaron los delitos'
        )
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Delitos perseguibles de oficio
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Columna del Anexo VII. Solo aplica si el detective conoció, durante la
              investigación, delitos perseguibles de oficio (Art. 37.4 Ley 5/2014) — deben
              denunciarse aunque no puedan investigarse.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Delitos perseguibles de oficio conocidos
            </label>
            <textarea
              value={knownOffenses}
              onChange={(e) => setKnownOffenses(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
              placeholder="Dejar en blanco si no aplica"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Órgano al que se comunicaron
            </label>
            <input
              value={offensesReportedTo}
              onChange={(e) => setOffensesReportedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Ej. Comisaría de..."
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
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useFirm } from '@/hooks/useFirm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save, Euro } from 'lucide-react'

export function TariffsTab() {
  const { firm, loading, updateTariffs } = useFirm()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    diurna: '',
    nocturna: '',
    festivo: '',
    finde: '',
    kmRate: '',
    dailyAllowance: '',
  })

  useEffect(() => {
    if (!firm) return
    const t = (firm as unknown as Record<string, unknown>).tariffs as Record<string, number> | undefined
    if (!t) return
    setForm({
      diurna: t.diurna?.toString() ?? '',
      nocturna: t.nocturna?.toString() ?? '',
      festivo: t.festivo?.toString() ?? '',
      finde: t.finde?.toString() ?? '',
      kmRate: t.kmRate?.toString() ?? '',
      dailyAllowance: t.dailyAllowance?.toString() ?? '',
    })
  }, [firm])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateTariffs({
        diurna: form.diurna ? parseFloat(form.diurna) : undefined,
        nocturna: form.nocturna ? parseFloat(form.nocturna) : undefined,
        festivo: form.festivo ? parseFloat(form.festivo) : undefined,
        finde: form.finde ? parseFloat(form.finde) : undefined,
        kmRate: form.kmRate ? parseFloat(form.kmRate) : undefined,
        dailyAllowance: form.dailyAllowance ? parseFloat(form.dailyAllowance) : undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Euro className="w-4 h-4 text-muted-foreground" />
          Tarifas por hora
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Estas tarifas se usarán como referencia para la generación de presupuestos.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'diurna', label: 'Tarifa diurna', hint: 'Lunes a viernes, horario diurno' },
            { name: 'nocturna', label: 'Tarifa nocturna', hint: 'Horario nocturno (22:00 - 06:00)' },
            { name: 'finde', label: 'Tarifa fin de semana', hint: 'Sábados y domingos' },
            { name: 'festivo', label: 'Tarifa festivos', hint: 'Días festivos nacionales y locales' },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 pr-8 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €/h
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Gastos adicionales</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Tarifa por kilómetro
            </label>
            <div className="relative">
              <input
                type="number"
                name="kmRate"
                value={form.kmRate}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                €/km
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Dietas por día
            </label>
            <div className="relative">
              <input
                type="number"
                name="dailyAllowance"
                value={form.dailyAllowance}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 pr-8 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                €/día
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar tarifas'}
        </button>
        {saved && (
          <p className="text-sm text-green-600">Tarifas guardadas correctamente.</p>
        )}
      </div>
    </form>
  )
}
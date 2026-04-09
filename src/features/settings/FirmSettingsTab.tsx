import { useState, useEffect } from 'react'
import { useFirm } from '@/hooks/useFirm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Building2, Save } from 'lucide-react'

export function FirmSettingsTab() {
  const { firm, loading, update } = useFirm()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    legalName: '',
    tradeName: '',
    taxId: '',
    rnsp: '',
    tipNumber: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
  })

  useEffect(() => {
    if (!firm) return
    setForm({
      legalName: firm.legalName,
      tradeName: firm.tradeName ?? '',
      taxId: firm.taxId,
      rnsp: firm.rnsp,
      tipNumber: firm.titular.tipNumber,
      street: firm.registeredAddress.street,
      city: firm.registeredAddress.city,
      province: firm.registeredAddress.province,
      postalCode: firm.registeredAddress.postalCode,
    })
  }, [firm])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await update({
        legalName: form.legalName,
        tradeName: form.tradeName || undefined,
        taxId: form.taxId,
        rnsp: form.rnsp,
        tipNumber: form.tipNumber,
        street: form.street,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!firm) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          Datos del despacho
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {firm.legalType === 'individual' ? 'Nombre completo' : 'Razón social'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="legalName"
                value={form.legalName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nombre comercial
                <span className="text-slate-400 font-normal ml-1">(opcional)</span>
              </label>
              <input
                name="tradeName"
                value={form.tradeName}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {firm.legalType === 'individual' ? 'DNI / NIE' : 'CIF'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="taxId"
                value={form.taxId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Número RNSP
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                name="rnsp"
                value={form.rnsp}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              TIP del titular
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              name="tipNumber"
              value={form.tipNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
            />
            <p className="text-xs text-slate-400 mt-1">
              Tarjeta de Identidad Profesional del detective titular habilitado.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Sede principal</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              name="street"
              value={form.street}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Calle, número, piso..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              required
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Ciudad"
            />
            <input
              name="province"
              value={form.province}
              onChange={handleChange}
              required
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Provincia"
            />
            <input
              name="postalCode"
              value={form.postalCode}
              onChange={handleChange}
              required
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="C.P."
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && (
          <p className="text-sm text-green-600">Cambios guardados correctamente.</p>
        )}
      </div>
    </form>
  )
}
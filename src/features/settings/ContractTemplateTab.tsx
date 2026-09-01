import { useState, useEffect } from 'react'
import { useFirm } from '@/hooks/useFirm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Save } from 'lucide-react'
import { CONTRACT_PLACEHOLDERS } from '@/lib/contractTemplate'

export function ContractTemplateTab() {
  const { firm, loading, updateTemplate } = useFirm()
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!firm) return
    setName(firm.contractTemplate?.name ?? 'Contrato de prestación de servicios de investigación privada')
    setBody(firm.contractTemplate?.body ?? '')
  }, [firm])

  const insertPlaceholder = (key: string) => {
    setBody((prev) => prev + `{{${key}}}`)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTemplate({ name, body })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Plantilla de contrato
        </h3>
        <p className="text-xs text-muted-foreground">
          Se usa para generar el contrato de cada cliente particular. Los placeholders se
          rellenan automáticamente con los datos del cliente y del expediente al crear el
          contrato; revísalo y ajústalo antes de enviarlo.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          Nombre de la plantilla
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Ej: Contrato de prestación de servicios"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          Placeholders disponibles — pulsa para insertar
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONTRACT_PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => insertPlaceholder(p.key)}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono bg-muted text-muted-foreground border border-border hover:bg-muted transition-colors"
              title={p.label}
            >
              {`{{${p.key}}}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">
          Texto del contrato
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y focus:border-primary font-mono"
          placeholder={`Entre {{despacho_nombre}} (RNSP {{despacho_rnsp}}) y {{cliente_nombre}} (DNI/NIF {{cliente_dni}}), con domicilio en {{cliente_domicilio}}, se acuerda la prestación del siguiente servicio de investigación privada:\n\nObjeto: {{objeto}}\n\nImporte acordado: {{importe}}\n\nFecha: {{fecha}}`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !body.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar plantilla'}
        </button>
        {saved && (
          <p className="text-sm text-green-600">Plantilla guardada correctamente.</p>
        )}
      </div>
    </div>
  )
}

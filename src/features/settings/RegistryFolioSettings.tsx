import { useState, useEffect, useCallback } from 'react'
import { FileStack, Stamp, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getRegistryBookConfig,
  saveRegistryBookConfig,
  type RegistryBookConfig,
} from '@/services/registryFolios'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function numberOr(value: string, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

// La ley permite llevar el libro en soporte informático, pero para que
// valga tiene que acabar impreso sobre hojas numeradas y selladas, con la
// diligencia de habilitación de la unidad policial en la primera. Aquí se
// describe ese libro físico, para que la plataforma imprima encajando en
// él en vez de sacar un listado que no cuadra con nada.
export function RegistryFolioSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<RegistryBookConfig | null>(null)

  const [rows, setRows] = useState('10')
  const [firstFolio, setFirstFolio] = useState('1')
  const [firstEntry, setFirstEntry] = useState('1')
  const [dilDate, setDilDate] = useState('')
  const [dilAuthority, setDilAuthority] = useState('')
  const [dilReference, setDilReference] = useState('')
  const [dilFolios, setDilFolios] = useState('')

  const load = useCallback(async () => {
    if (!user?.firmId) return
    setLoading(true)
    try {
      const c = await getRegistryBookConfig(user.firmId)
      setConfig(c)
      setRows(String(c.rowsPerFolio))
      setFirstFolio(String(c.firstFolio))
      setFirstEntry(String(c.firstEntry))
      if (c.diligence) {
        setDilDate(c.diligence.date.toISOString().slice(0, 10))
        setDilAuthority(c.diligence.authority)
        setDilReference(c.diligence.reference)
        setDilFolios(String(c.diligence.foliosAuthorized))
      }
    } catch (err) {
      console.error(err)
      setError('No se pudo leer la configuración del libro.')
    } finally {
      setLoading(false)
    }
  }, [user?.firmId])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.firmId) return
    setSaving(true)
    setError(null)
    try {
      await saveRegistryBookConfig(user.firmId, {
        rowsPerFolio: numberOr(rows, 10),
        firstFolio: numberOr(firstFolio, 1),
        firstEntry: numberOr(firstEntry, 1),
        diligence:
          dilDate && dilAuthority
            ? {
                date: new Date(dilDate),
                authority: dilAuthority.trim(),
                reference: dilReference.trim(),
                foliosAuthorized: numberOr(dilFolios, 0),
              }
            : undefined,
      })
      await load()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar la configuración del libro.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const printed = config?.printedFolios ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <FileStack className="w-4 h-4 text-muted-foreground" />
          El libro en papel
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          La plataforma imprime cada folio encajando en tu libro físico, para
          que puedas hacerlo sobre las hojas numeradas y selladas. Un asiento
          cae siempre en el mismo folio y en la misma fila, se imprima hoy o
          dentro de un año.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Asientos por folio
            </label>
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cuenta las filas de una hoja de tu libro.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Primer folio
            </label>
            <input
              type="number"
              min={1}
              value={firstFolio}
              onChange={(e) => setFirstFolio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">
              El folio donde empieza este libro.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Asiento que lo abre
            </label>
            <input
              type="number"
              min={1}
              value={firstEntry}
              onChange={(e) => setFirstEntry(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">
              El nº del primer asiento de ese folio.
            </p>
          </div>
        </div>

        {printed.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
            Folios ya impresos sobre hoja sellada:{' '}
            <span className="tabular-nums text-foreground">{printed.join(', ')}</span>.
            No se vuelven a imprimir. Cambiar los números de arriba no los
            reasigna: la hoja ya está escrita.
          </p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Stamp className="w-4 h-4 text-muted-foreground" />
          Diligencia de habilitación
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          Los datos de la diligencia con la que la unidad policial habilitó el
          libro. Se imprimen al pie de cada folio, que es donde un inspector
          los busca.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Fecha de la diligencia
            </label>
            <input
              type="date"
              value={dilDate}
              onChange={(e) => setDilDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Referencia
            </label>
            <input
              type="text"
              value={dilReference}
              onChange={(e) => setDilReference(e.target.value)}
              placeholder="Nº de diligencia"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Unidad policial
            </label>
            <input
              type="text"
              value={dilAuthority}
              onChange={(e) => setDilAuthority(e.target.value)}
              placeholder="Comisaría Provincial de..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Folios habilitados
            </label>
            <input
              type="number"
              min={0}
              value={dilFolios}
              onChange={(e) => setDilFolios(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {saved && <p className="text-xs text-green-700">Configuración guardada.</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}

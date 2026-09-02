import { useState, useEffect, useCallback } from 'react'
import { X, FileDown, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { useFirm } from '@/hooks/useFirm'
import { useAuth } from '@/contexts/AuthContext'
import {
  buildFolios,
  getRegistryBookConfig,
  markFoliosPrinted,
  folioRange,
  type Folio,
  type RegistryBookConfig,
} from '@/services/registryFolios'
import { exportRegistryToCsv } from '@/services/registryExport'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { RegistryEntry } from '@/types'

interface Props {
  open: boolean
  entries: RegistryEntry[]
  onClose: () => void
  onPrinted: () => void
}

// El libro se imprime folio a folio sobre hojas numeradas y selladas. Dos
// reglas mandan sobre todo lo demás: un folio a medias no se imprime
// todavía —los asientos que faltan ya no cabrían en esa hoja— y un folio
// impreso no se reimprime, porque la hoja sellada es única.
export function RegistryFolioDialog({ open, entries, onClose, onPrinted }: Props) {
  const { firm } = useFirm()
  const { user } = useAuth()
  const [config, setConfig] = useState<RegistryBookConfig | null>(null)
  const [folios, setFolios] = useState<Folio[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [exported, setExported] = useState(false)
  const [marking, setMarking] = useState(false)

  const canPrint =
    user?.memberRole === 'firm_owner' || user?.memberRole === 'firm_director'

  const load = useCallback(async () => {
    if (!user?.firmId || !open) return
    setLoading(true)
    try {
      const c = await getRegistryBookConfig(user.firmId)
      const f = buildFolios(entries, c)
      setConfig(c)
      setFolios(f)
      // Preseleccionado: lo que se puede imprimir sin estropear una hoja.
      setSelected(new Set(f.filter((x) => x.state === 'completo').map((x) => x.number)))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId, entries, open])

  useEffect(() => {
    load()
  }, [load])

  if (!open) return null

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })

  const chosen = folios.filter((f) => selected.has(f.number))
  const reprinting = chosen.filter((f) => f.state === 'impreso')
  const partial = chosen.filter((f) => f.state === 'incompleto')

  const handleExport = async () => {
    if (!firm || chosen.length === 0) return
    const { exportFoliosToPdf } = await import('@/services/registryFolioExport')
    exportFoliosToPdf(chosen, firm, config!)
    setExported(true)
  }

  const handleMark = async () => {
    if (!user?.firmId) return
    setMarking(true)
    try {
      await markFoliosPrinted(user.firmId, chosen.map((f) => f.number))
      await load()
      setExported(false)
      onPrinted()
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Imprimir el libro
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Folio a folio, sobre las hojas numeradas y selladas.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !config ? (
          <div className="p-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {folios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay asientos que caigan en ningún folio de este libro.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {folios.map((f) => {
                  const [from, to] = folioRange(f.number, config)
                  const isChosen = selected.has(f.number)
                  return (
                    <li key={f.number}>
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChosen
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChosen}
                          onChange={() => toggle(f.number)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground tabular-nums">
                            Folio {f.number}
                          </span>
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            Asientos {from}–{to} · {f.entries.length} de{' '}
                            {config.rowsPerFolio} escritos
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${
                            f.state === 'impreso'
                              ? 'bg-muted text-muted-foreground border-border'
                              : f.state === 'completo'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {f.state === 'impreso'
                            ? 'Ya impreso'
                            : f.state === 'completo'
                              ? 'Listo'
                              : `Faltan ${f.free}`}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}

            {partial.length > 0 && (
              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">
                  El folio {partial.map((f) => f.number).join(', ')} está a medias.
                  Si lo imprimes ahora, los asientos que falten ya no cabrán en esa
                  hoja sellada y habrá que darla por gastada.
                </p>
              </div>
            )}

            {reprinting.length > 0 && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  El folio {reprinting.map((f) => f.number).join(', ')} ya se imprimió.
                  Esa hoja sellada está escrita: solo vuelve a sacarlo si vas a usar
                  una hoja distinta y puedes justificar el cambio.
                </p>
              </div>
            )}

            {!exported ? (
              <div className="flex gap-3">
                <button
                  onClick={() => firm && exportRegistryToCsv(entries, firm.rnsp)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Copia en CSV
                </button>
                <button
                  onClick={handleExport}
                  disabled={chosen.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  {chosen.length === 1
                    ? 'Imprimir 1 folio'
                    : `Imprimir ${chosen.length} folios`}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-xs text-green-800">
                    Descargado. Cuando lo tengas impreso sobre las hojas selladas,
                    márcalo aquí para que no vuelvan a salir.
                  </p>
                </div>
                {canPrint ? (
                  <button
                    onClick={handleMark}
                    disabled={marking}
                    className="w-full px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {marking
                      ? 'Guardando...'
                      : `Marcar como impreso el folio ${chosen.map((f) => f.number).join(', ')}`}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Solo el titular o un director del despacho puede dar un folio por
                    impreso.
                  </p>
                )}
                <button
                  onClick={() => setExported(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Volver
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { X, Upload, AlertTriangle, Check, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFirm } from '@/hooks/useFirm'
import {
  parseTable,
  guessMapping,
  buildPreview,
  IMPORT_FIELDS,
  FIELD_LABELS,
  type ImportField,
} from '@/services/registryImportParse'
import { importHistoricEntries } from '@/services/registryImport'
import type { RegistryEntry } from '@/types'

interface Props {
  open: boolean
  existing: RegistryEntry[]
  onClose: () => void
  onImported: () => void
}

type Step = 'pegar' | 'revisar' | 'hecho'

// Un despacho que llega con doscientos asuntos en papel no va a teclearlos.
// Casi todos llevan además una copia en Excel del mismo libro: se pega
// aquí tal cual, se comprueba qué columna es cada cosa y entra el
// histórico completo, marcado como asientos de papel.
export function ImportBookDialog({ open, existing, onClose, onImported }: Props) {
  const { user } = useAuth()
  const { firm } = useFirm()
  const [step, setStep] = useState<Step>('pegar')
  const [text, setText] = useState('')
  const [mapping, setMapping] = useState<Record<ImportField, number> | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const table = useMemo(() => (text ? parseTable(text) : null), [text])
  const preview = useMemo(
    () => (table && mapping ? buildPreview(table, mapping, existing) : null),
    [table, mapping, existing]
  )

  if (!open) return null

  const handleContinue = () => {
    if (!table || table.rows.length === 0) {
      setError('No se ha reconocido ninguna fila. Pega el libro incluyendo la fila de encabezados.')
      return
    }
    setError(null)
    setMapping(guessMapping(table.headers))
    setStep('revisar')
  }

  const handleFile = async (file: File) => {
    setText(await file.text())
    setError(null)
  }

  const handleImport = async () => {
    if (!user?.firmId || !preview || preview.valid.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const n = await importHistoricEntries(
        user.firmId,
        user.uid,
        firm?.rnsp ?? '',
        preview.valid
      )
      setImported(n)
      setStep('hecho')
      onImported()
    } catch (err) {
      console.error(err)
      setError('No se pudieron importar los asientos. No se ha guardado nada.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Traer el libro de papel
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Los asientos ya anotados a mano, para que el archivo empiece con
              todo el histórico dentro.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'pegar' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Pega aquí el libro
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecciona las filas en tu Excel —incluida la de encabezados— y
                  pégalas. También vale un CSV.
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  placeholder={
                    'Nº\tFecha inicio\tFecha fin\tAsunto\tContratante\tInvestigado\n1\t12/03/2019\t28/03/2019\tLaboral\tIndustrias del Sur S.L.\tPedro Ruiz'
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Subir un CSV
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                  />
                </label>
                {table && table.rows.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {table.rows.length} filas y {table.headers.length} columnas
                    reconocidas.
                  </span>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleContinue}
                disabled={!text.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'revisar' && table && mapping && preview && (
            <>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  Qué columna es cada cosa
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Se ha adivinado por el encabezado. Corrige lo que no cuadre; lo
                  que dejes «sin usar» se queda vacío en el asiento.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {IMPORT_FIELDS.map((field) => (
                    <label key={field} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">
                        {FIELD_LABELS[field]}
                      </span>
                      <select
                        value={mapping[field]}
                        onChange={(e) =>
                          setMapping({ ...mapping, [field]: Number(e.target.value) })
                        }
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value={-1}>— sin usar —</option>
                        {table.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Columna ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted border border-border rounded-lg">
                <p className="text-sm text-foreground">
                  <span className="font-semibold tabular-nums">
                    {preview.valid.length}
                  </span>{' '}
                  {preview.valid.length === 1 ? 'asiento listo' : 'asientos listos'}
                  {preview.firstNumber !== null && (
                    <span className="text-muted-foreground">
                      {' '}
                      · del nº {preview.firstNumber} al {preview.lastNumber}
                    </span>
                  )}
                </p>
                {preview.valid.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Después de importarlos, el siguiente asiento de la plataforma
                    será el nº {preview.lastNumber! + 1}.
                  </p>
                )}
                {preview.gaps.length > 0 && (
                  <p className="text-xs text-amber-800 mt-1.5">
                    Faltan números por el medio ({preview.gaps.slice(0, 10).join(', ')}
                    {preview.gaps.length > 10 ? '…' : ''}). Si tu libro los tiene,
                    revisa que no se haya quedado ninguna fila fuera.
                  </p>
                )}
              </div>

              {preview.rows.some((r) => r.errors.length > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {preview.rows.filter((r) => r.errors.length > 0).length} filas se
                    quedan fuera
                  </p>
                  <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                    {preview.rows
                      .filter((r) => r.errors.length > 0)
                      .slice(0, 20)
                      .map((r) => (
                        <li key={r.line} className="text-xs text-amber-800">
                          Línea {r.line}: {r.errors.join('; ')}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Primeras filas tal y como quedarían */}
              {preview.valid.length > 0 && (
                <div className="border border-border rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Nº
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Inicio
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Contratante
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Investigado
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                          Asunto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.valid.slice(0, 5).map((r) => (
                        <tr key={r.line}>
                          <td className="px-3 py-1.5 font-mono tabular-nums">
                            {r.entryNumber}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {r.startDate?.toLocaleDateString('es-ES') ?? '—'}
                          </td>
                          <td className="px-3 py-1.5">{r.values.clientName}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {r.values.investigatedName || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[16rem]">
                            {r.values.investigationObject || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('pegar')}
                  className="px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || preview.valid.length === 0}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {importing
                    ? 'Importando...'
                    : `Importar ${preview.valid.length} asientos`}
                </button>
              </div>
            </>
          )}

          {step === 'hecho' && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {imported} asientos en el archivo
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                Quedan marcados como asientos de papel, así que no se les exige
                contrato ni informe digital. La numeración de la plataforma
                continúa donde la dejó el libro.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Ver el archivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

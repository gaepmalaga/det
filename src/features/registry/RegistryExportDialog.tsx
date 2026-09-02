import { useState } from 'react'
import { X, FileDown, Download, CheckCircle } from 'lucide-react'
import { useFirm } from '@/hooks/useFirm'
import { useAuth } from '@/contexts/AuthContext'
import { setRegistryLastPrinted } from '@/services/registry'
import { exportRegistryToPdf, exportRegistryToCsv } from '@/services/registryExport'
import type { RegistryEntry } from '@/types'

interface RegistryExportDialogProps {
  open: boolean
  entries: RegistryEntry[]
  onClose: () => void
  onMarkedPrinted: () => void
}

type RangeMode = 'nuevo' | 'todo' | 'rango'

export function RegistryExportDialog({ open, entries, onClose, onMarkedPrinted }: RegistryExportDialogProps) {
  const { firm, reload: reloadFirm } = useFirm()
  const { user } = useAuth()
  const lastPrinted = firm?.registryLastPrintedEntry ?? 0
  const maxEntry = entries.reduce((max, e) => Math.max(max, e.entryNumber), 0)
  const pendingCount = entries.filter((e) => e.entryNumber > lastPrinted).length

  const [mode, setMode] = useState<RangeMode>(pendingCount > 0 ? 'nuevo' : 'todo')
  const [rangeFrom, setRangeFrom] = useState(1)
  const [rangeTo, setRangeTo] = useState(maxEntry || 1)
  const [exported, setExported] = useState<{ maxNumber: number } | null>(null)
  const [marking, setMarking] = useState(false)

  const canManagePrint = user?.memberRole === 'firm_owner' || user?.memberRole === 'firm_director'

  if (!open) return null

  const selectedEntries = (() => {
    const sorted = [...entries].sort((a, b) => a.entryNumber - b.entryNumber)
    if (mode === 'nuevo') return sorted.filter((e) => e.entryNumber > lastPrinted)
    if (mode === 'rango') return sorted.filter((e) => e.entryNumber >= rangeFrom && e.entryNumber <= rangeTo)
    return sorted
  })()

  const rangeLabel = (() => {
    if (selectedEntries.length === 0) return 'Sin asientos en el rango seleccionado.'
    const from = selectedEntries[0].entryNumber
    const to = selectedEntries[selectedEntries.length - 1].entryNumber
    return `Asientos nº ${from} a ${to} (${selectedEntries.length} de ${entries.length})`
  })()

  const handleExport = (kind: 'pdf' | 'csv') => {
    if (!firm || selectedEntries.length === 0) return
    if (kind === 'pdf') {
      exportRegistryToPdf(selectedEntries, firm, rangeLabel)
    } else {
      exportRegistryToCsv(selectedEntries, firm.rnsp)
    }
    const maxNumber = selectedEntries[selectedEntries.length - 1].entryNumber
    setExported({ maxNumber })
  }

  const handleMarkPrinted = async () => {
    if (!firm || !exported) return
    setMarking(true)
    try {
      await setRegistryLastPrinted(firm.id, exported.maxNumber)
      await reloadFirm()
      onMarkedPrinted()
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Exportar libro-registro</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                checked={mode === 'nuevo'}
                onChange={() => setMode('nuevo')}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Solo lo nuevo desde la última impresión
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {lastPrinted > 0
                    ? `Ya se imprimió hasta el asiento nº ${lastPrinted}. Hay ${pendingCount} sin imprimir.`
                    : `Nunca se ha marcado ninguna impresión — se exportarían los ${entries.length} asientos.`}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                checked={mode === 'todo'}
                onChange={() => setMode('todo')}
                className="mt-0.5"
              />
              <span className="block text-sm font-medium text-foreground">
                Todo el libro ({entries.length} asientos)
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                checked={mode === 'rango'}
                onChange={() => setMode('rango')}
                className="mt-0.5"
              />
              <span className="block text-sm font-medium text-foreground">
                Rango de asientos concreto
              </span>
            </label>
            {mode === 'rango' && (
              <div className="flex items-center gap-2 pl-6">
                <input
                  type="number"
                  min={1}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(Number(e.target.value))}
                  className="w-24 px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">a</span>
                <input
                  type="number"
                  min={1}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(Number(e.target.value))}
                  className="w-24 px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-muted border border-border rounded-lg">
            <p className="text-xs text-foreground">{rangeLabel}</p>
          </div>

          {!exported ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={selectedEntries.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={selectedEntries.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-800">
                  Descargado. Cuando termines de imprimirlo, márcalo para no repetir estos folios la próxima vez.
                </p>
              </div>
              {canManagePrint ? (
                <button
                  onClick={handleMarkPrinted}
                  disabled={marking}
                  className="w-full px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {marking ? 'Guardando...' : `Marcar como impreso hasta el nº ${exported.maxNumber}`}
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Solo el titular o un director del despacho puede marcar el libro como impreso.
                </p>
              )}
              <button
                onClick={() => setExported(null)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Volver a exportar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

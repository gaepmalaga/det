import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, Download, AlertTriangle, Pencil, Archive } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getRegistryEntries } from '@/services/registry'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { RegistryOffensesDialog } from './RegistryOffensesDialog'
import { RegistryExportDialog } from './RegistryExportDialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RegistryEntry } from '@/types'

export function RegistryBookPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<RegistryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'abierto' | 'cerrado'>('todos')
  const [editingEntry, setEditingEntry] = useState<RegistryEntry | null>(null)
  const [showExport, setShowExport] = useState(false)

  const load = useCallback(async () => {
    if (!user?.firmId) return
    setLoading(true)
    try {
      const data = await getRegistryEntries(user.firmId)
      setEntries(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = entries.filter((e) => {
    const matchStatus = statusFilter === 'todos' || e.status === statusFilter
    const matchSearch =
      !search ||
      e.clientName.toLowerCase().includes(search.toLowerCase()) ||
      e.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.detectiveName.toLowerCase().includes(search.toLowerCase()) ||
      String(e.entryNumber).includes(search)
    return matchStatus && matchSearch
  })

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Libro-registro"
        description="Registro oficial de servicios de investigación privada."
        action={
          <button
            onClick={() => setShowExport(true)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        }
      />

      {/* Tabs de estado */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(['todos', 'abierto', 'cerrado'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              statusFilter === s
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'todos' ? 'Todos' : s === 'abierto' ? 'Abiertos' : 'Cerrados'}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por cliente, expediente, detective o nº asiento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin asientos"
          description="Los asientos se generan automáticamente al firmar el contrato de un expediente."
        />
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                onClick={() => navigate(`/app/registry-book/${entry.id}`)}
                className="bg-card border border-border rounded-xl p-4 shadow-sm cursor-pointer active:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {String(entry.entryNumber).padStart(4, '0')}
                    </span>
                    {entry.origin === 'historico' && (
                      <Archive
                        className="w-3.5 h-3.5 text-amber-600"
                        aria-label="Asiento histórico en papel"
                      />
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        entry.status === 'abierto'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {entry.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(entry.entryDate, 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Contratante</p>
                    <p className="text-sm font-medium text-foreground">
                      {entry.clientName}
                    </p>
                    {entry.clientTaxId && (
                      <p className="text-xs text-muted-foreground uppercase">
                        {entry.clientTaxId}
                      </p>
                    )}
                    {entry.clientAddress && (
                      <p className="text-xs text-muted-foreground">
                        {entry.clientAddress}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Objeto</p>
                    <p className="text-xs text-foreground line-clamp-2">
                      {entry.investigationObject}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Investigado</p>
                    <p className="text-sm text-foreground">{entry.investigatedName || '—'}</p>
                    {entry.investigatedAddress && (
                      <p className="text-xs text-muted-foreground">{entry.investigatedAddress}</p>
                    )}
                  </div>

                  {entry.knownOffenses && (
                    <div className="flex gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 line-clamp-2">{entry.knownOffenses}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Detective</p>
                      <p className="text-sm text-foreground">{entry.detectiveName}</p>
                      {entry.detectiveTip && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.detectiveTip}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.caseNumber}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingEntry(entry)
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        aria-label="Editar delitos perseguibles de oficio"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">
                    Nº
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Contratante
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Objeto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                    Investigado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Detective
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Expediente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 w-10">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => navigate(`/app/registry-book/${entry.id}`)}
                    className="hover:bg-muted transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        {String(entry.entryNumber).padStart(4, '0')}
                        {entry.origin === 'historico' && (
                          <Archive
                            className="w-3 h-3 text-amber-600"
                            aria-label="Asiento histórico en papel"
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(entry.entryDate, 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {entry.clientName}
                      </p>
                      {entry.clientTaxId && (
                        <p className="text-xs text-muted-foreground uppercase">
                          {entry.clientTaxId}
                        </p>
                      )}
                      {entry.clientAddress && (
                        <p className="text-xs text-muted-foreground truncate max-w-[16rem]">
                          {entry.clientAddress}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs hidden lg:table-cell">
                      <p className="truncate text-xs">
                        {entry.investigationObject}
                      </p>
                    </td>
                    <td className="px-4 py-3 max-w-xs hidden xl:table-cell">
                      <p className="text-xs text-foreground truncate">
                        {entry.investigatedName || '—'}
                      </p>
                      {entry.investigatedAddress && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.investigatedAddress}
                        </p>
                      )}
                      {entry.knownOffenses && (
                        <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          Delitos conocidos
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {entry.detectiveName}
                      </p>
                      {entry.detectiveTip && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.detectiveTip}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                      {entry.caseNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          entry.status === 'abierto'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {entry.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingEntry(entry)
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        aria-label="Editar delitos perseguibles de oficio"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingEntry && (
        <RegistryOffensesDialog
          open={true}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null)
            load()
          }}
        />
      )}

      {showExport && (
        <RegistryExportDialog
          open={true}
          entries={entries}
          onClose={() => setShowExport(false)}
          onMarkedPrinted={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
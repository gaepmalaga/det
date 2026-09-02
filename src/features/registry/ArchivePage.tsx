import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Search,
  Download,
  ChevronRight,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getRegistryEntries } from '@/services/registry'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { RegistryExportDialog } from './RegistryExportDialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RegistryEntry } from '@/types'

// Un detective guarda carpetas por año, y dentro una carpeta por asunto
// del libro. El Archivo es esa misma estantería: los años como lomos, los
// asuntos dentro. La diferencia es que aquí se busca por cualquier campo y
// el asunto se abre entero, no hay que ir a buscar el contrato a otro
// armario.
interface YearGroup {
  year: number
  entries: RegistryEntry[]
  open: number
  from: number
  to: number
}

function groupByYear(entries: RegistryEntry[]): YearGroup[] {
  const map = new Map<number, RegistryEntry[]>()
  entries.forEach((e) => {
    const year = e.startDate.getFullYear()
    const list = map.get(year)
    if (list) list.push(e)
    else map.set(year, [e])
  })

  return [...map.entries()]
    .map(([year, list]) => {
      const sorted = [...list].sort((a, b) => b.entryNumber - a.entryNumber)
      const numbers = sorted.map((e) => e.entryNumber)
      return {
        year,
        entries: sorted,
        open: sorted.filter((e) => e.status === 'abierto').length,
        from: Math.min(...numbers),
        to: Math.max(...numbers),
      }
    })
    .sort((a, b) => b.year - a.year)
}

export function ArchivePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<RegistryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [showExport, setShowExport] = useState(false)

  const load = useCallback(async () => {
    if (!user?.firmId) return
    setLoading(true)
    try {
      const data = await getRegistryEntries(user.firmId)
      setEntries(data)
      // Se abre el año en curso y se cierran los anteriores: lo del año
      // pasado se consulta, lo de este año se trabaja.
      const years = new Set(data.map((e) => e.startDate.getFullYear()))
      const current = Math.max(...years)
      setCollapsed(new Set([...years].filter((y) => y !== current)))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId])

  useEffect(() => {
    load()
  }, [load])

  const term = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      !term
        ? entries
        : entries.filter((e) =>
            [
              e.clientName,
              e.clientTaxId,
              e.investigatedName,
              e.investigationObject,
              e.detectiveName,
              e.caseNumber,
              String(e.entryNumber),
            ]
              .join(' ')
              .toLowerCase()
              .includes(term)
          ),
    [entries, term]
  )

  const groups = useMemo(() => groupByYear(filtered), [filtered])

  const toggle = (year: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })

  if (loading) return <LoadingSpinner />

  return (
    <div className="pb-8">
      <PageHeader
        title="Archivo"
        description="Todos los asuntos del despacho, por año y número de asiento."
        action={
          <button
            onClick={() => setShowExport(true)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar el libro</span>
          </button>
        }
      />

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nº de asiento, cliente, NIF, investigado, objeto o detective..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="El archivo está vacío"
          description="Cada asunto entra en el archivo al firmarse su contrato, cuando se anota en el libro-registro."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Ningún asunto coincide"
          description={`No hay asuntos que contengan «${search}».`}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = !collapsed.has(group.year)
            return (
              <section
                key={group.year}
                className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggle(group.year)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted transition-colors"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                  <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-base font-semibold text-foreground tabular-nums">
                    {group.year}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {group.entries.length}{' '}
                    {group.entries.length === 1 ? 'asunto' : 'asuntos'} · asientos{' '}
                    {group.from}–{group.to}
                  </span>
                  {group.open > 0 && (
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-green-50 text-green-700 border-green-200 shrink-0">
                      {group.open} {group.open === 1 ? 'abierto' : 'abiertos'}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <ul className="divide-y divide-border border-t border-border">
                    {group.entries.map((entry) => (
                      <li key={entry.id}>
                        <button
                          onClick={() => navigate(`/app/registry-book/${entry.id}`)}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
                        >
                          <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded shrink-0 tabular-nums">
                            {String(entry.entryNumber).padStart(4, '0')}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">
                                {entry.clientName}
                              </span>
                              {entry.investigatedName && (
                                <span className="text-xs text-muted-foreground">
                                  contra {entry.investigatedName}
                                </span>
                              )}
                              {entry.origin === 'historico' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border bg-amber-50 text-amber-800 border-amber-200">
                                  <Archive className="w-3 h-3" />
                                  papel
                                </span>
                              )}
                              {entry.knownOffenses && (
                                <AlertTriangle
                                  className="w-3.5 h-3.5 text-amber-600"
                                  aria-label="Delitos perseguibles de oficio conocidos"
                                />
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground truncate mt-0.5">
                              {entry.investigationObject}
                            </span>
                          </span>

                          <span className="text-right shrink-0 hidden sm:block">
                            <span className="block text-xs text-muted-foreground tabular-nums">
                              {format(entry.startDate, 'dd/MM/yyyy', { locale: es })}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium border ${
                                entry.status === 'abierto'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {entry.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
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

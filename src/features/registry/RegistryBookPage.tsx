import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Search, Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getRegistryEntries } from '@/services/registry'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RegistryEntry } from '@/types'

export function RegistryBookPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<RegistryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'abierto' | 'cerrado'>('todos')

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
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        }
      />

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(['todos', 'abierto', 'cerrado'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              statusFilter === s
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s === 'todos' ? 'Todos' : s === 'abierto' ? 'Abiertos' : 'Cerrados'}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por cliente, expediente, detective o nº asiento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin asientos"
          description="Los asientos se generan automáticamente al firmar el contrato de un expediente."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide w-16">
                  Nº
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Contratante
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Objeto
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Detective
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Expediente
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 font-semibold">
                    {String(entry.entryNumber).padStart(4, '0')}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {format(entry.entryDate, 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{entry.clientName}</p>
                    {entry.clientTaxId && (
                      <p className="text-xs text-slate-500 uppercase">{entry.clientTaxId}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">
                    <p className="truncate text-xs">{entry.investigationObject}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{entry.detectiveName}</p>
                    {entry.detectiveTip && (
                      <p className="text-xs text-slate-500 font-mono">{entry.detectiveTip}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {entry.caseNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      entry.status === 'abierto'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {entry.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
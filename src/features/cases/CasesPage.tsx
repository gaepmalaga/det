import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Search } from 'lucide-react'
import { useCases } from '@/hooks/useCases'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CaseStatusBadge } from '@/components/shared/StatusBadge'
import { ROUTES } from '@/constants/routes'
import { CASE_STATUS_LABELS } from '@/constants/cases'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CaseStatus } from '@/types'

const STATUS_TABS: { label: string; value: CaseStatus | 'todos' | 'activos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'activos' },
  { label: 'En revisión', value: 'revision' },
  { label: 'Presupuesto', value: 'presupuesto' },
  { label: 'Contrato pendiente', value: 'contrato_pendiente' },
  { label: 'Suspendidos', value: 'suspendido' },
  { label: 'Trabajo terminado', value: 'trabajo_terminado' },
  { label: 'Cerrados', value: 'cerrado' },
]

const ACTIVE_STATUSES: CaseStatus[] = [
  'revision',
  'presupuesto',
  'contrato_pendiente',
  'activo',
  'suspendido',
  'trabajo_terminado',
]

export function CasesPage() {
  const { cases, loading, error } = useCases()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<CaseStatus | 'todos' | 'activos'>('activos')
  const [search, setSearch] = useState('')

  const filtered = cases.filter((c) => {
    const matchStatus =
      activeTab === 'todos'
        ? true
        : activeTab === 'activos'
        ? ACTIVE_STATUSES.includes(c.status)
        : c.status === activeTab

    const matchSearch =
      !search ||
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.investigationType.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())

    return matchStatus && matchSearch
  })

  const counts = cases.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      if (ACTIVE_STATUSES.includes(c.status)) {
        acc['activos'] = (acc['activos'] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <PageHeader
        title="Expedientes"
        description="Gestión completa de expedientes de investigación."
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.value
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {counts[tab.value] ? (
              <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                {counts[tab.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por número, tipo o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        />
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No hay expedientes"
          description="Los expedientes se crean desde una solicitud aceptada."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Nº expediente
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Tipo de investigación
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Cumplimiento
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Apertura
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/app/cases/${c.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {c.caseNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {c.investigationType}
                    </div>
                    {c.investigationTypeCustom && (
                      <div className="text-xs text-slate-500">
                        {c.investigationTypeCustom}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CaseStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex w-2 h-2 rounded-full ${
                        c.complianceStatus === 'green'
                          ? 'bg-green-500'
                          : c.complianceStatus === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
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
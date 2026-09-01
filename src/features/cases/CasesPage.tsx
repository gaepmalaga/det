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
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {counts[tab.value] ? (
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {counts[tab.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por número, tipo o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No hay expedientes"
          description="Los expedientes se crean desde una solicitud aceptada."
        />
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate('/app/cases/' + c.id)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-foreground/20 transition-colors active:bg-muted"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {c.investigationType}
                    </p>
                    {c.investigationTypeCustom && (
                      <p className="text-xs text-muted-foreground truncate">
                        {c.investigationTypeCustom}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        c.complianceStatus === 'green'
                          ? 'bg-green-500'
                          : c.complianceStatus === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.caseNumber}
                    </span>
                    <CaseStatusBadge status={c.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nº expediente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tipo de investigación
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Cumplimiento
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Apertura
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate('/app/cases/' + c.id)}
                    className="hover:bg-muted cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.caseNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {c.investigationType}
                      </div>
                      {c.investigationTypeCustom && (
                        <div className="text-xs text-muted-foreground">
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
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
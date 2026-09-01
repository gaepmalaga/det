import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import { getAllFirms, type SuperadminFirm, type FirmStatus } from '@/services/superadmin'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_TABS: { label: string; value: FirmStatus | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'active' },
  { label: 'Trial', value: 'trial' },
  { label: 'Suspendidos', value: 'suspended' },
  { label: 'Cancelados', value: 'cancelled' },
]

const STATUS_CONFIG = {
  trial: {
    label: 'Trial',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  active: {
    label: 'Activo',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
  },
  suspended: {
    label: 'Suspendido',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-muted',
    border: 'border-border',
    text: 'text-muted-foreground',
  },
}

export function FirmsPage() {
  const navigate = useNavigate()
  const [firms, setFirms] = useState<SuperadminFirm[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FirmStatus | 'todos'>('todos')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAllFirms()
      .then(setFirms)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = firms.filter((f) => {
    const matchStatus = activeTab === 'todos' || f.status === activeTab
    const matchSearch =
      !search ||
      f.legalName.toLowerCase().includes(search.toLowerCase()) ||
      f.rnsp.toLowerCase().includes(search.toLowerCase()) ||
      (f.tradeName ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const counts = firms.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Despachos</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {firms.length} despacho{firms.length !== 1 ? 's' : ''} registrado{firms.length !== 1 ? 's' : ''} en la plataforma.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.value !== 'todos' && counts[tab.value] ? (
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
          placeholder="Buscar por nombre o RNSP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hay despachos"
          description="No se encontraron despachos con los filtros aplicados."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Despacho
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  RNSP
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Titular TIP
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Plan
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Alta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((firm) => {
                const config = STATUS_CONFIG[firm.status] ?? STATUS_CONFIG.trial
                return (
                  <tr
                    key={firm.id}
                    onClick={() => navigate('/superadmin/firms/' + firm.id)}
                    className="hover:bg-muted cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{firm.legalName}</p>
                      {firm.tradeName && (
                        <p className="text-xs text-muted-foreground">{firm.tradeName}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {firm.rnsp}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {firm.titular.tipNumber || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground capitalize">
                      {firm.planId}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${config.border} ${config.text}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {format(firm.createdAt, 'dd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
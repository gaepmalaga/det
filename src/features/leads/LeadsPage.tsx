import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Inbox, Search } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { LeadStatusBadge } from '@/components/shared/StatusBadge'
import { CreateLeadDialog } from './CreateLeadDialog'
import { ROUTES } from '@/constants/routes'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { LeadStatus } from '@/types'

const STATUS_TABS: { label: string; value: LeadStatus | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Nuevos', value: 'nuevo' },
  { label: 'En revisión', value: 'en_revision' },
  { label: 'Aceptados', value: 'aceptado' },
  { label: 'Rechazados', value: 'rechazado' },
]

export function LeadsPage() {
  const { leads, loading, error, create } = useLeads()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<LeadStatus | 'todos'>('todos')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = leads.filter((lead) => {
    const matchStatus = activeTab === 'todos' || lead.status === activeTab
    const matchSearch =
      !search ||
      lead.contactName.toLowerCase().includes(search.toLowerCase()) ||
      lead.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      lead.investigationType.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const counts = leads.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <PageHeader
        title="Solicitudes"
        description="Gestión de solicitudes entrantes y potenciales clientes."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva solicitud
          </button>
        }
      />

      {/* Tabs de estado */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
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
            {tab.value !== 'todos' && counts[tab.value] ? (
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
          placeholder="Buscar por nombre, referencia o tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        />
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No hay solicitudes"
          description={
            activeTab === 'todos'
              ? 'Cuando llegue una solicitud aparecerá aquí.'
              : 'No hay solicitudes con este estado.'
          }
          action={
            activeTab === 'todos' ? (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear primera solicitud
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Referencia
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Contacto
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Tipo de investigación
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() =>
                    navigate(
                      ROUTES.LEADS + '/' + lead.id
                    )
                  }
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {lead.referenceNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {lead.contactName}
                    </div>
                    {lead.companyName && (
                      <div className="text-xs text-slate-500">
                        {lead.companyName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.investigationType}
                    {lead.investigationTypeCustom && (
                      <span className="text-slate-400 ml-1">
                        — {lead.investigationTypeCustom}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(lead.createdAt, 'dd MMM yyyy', { locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateLeadDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (data) => {
          const id = await create(data)
          if (id) {
            setShowCreate(false)
            navigate(ROUTES.LEADS + '/' + id)
          }
        }}
      />
    </div>
  )
}
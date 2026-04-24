import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, Building2, User } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ContactType } from '@/types'

const TYPE_TABS: { label: string; value: ContactType | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Particulares', value: 'individual' },
  { label: 'Corporativos', value: 'corporate' },
]

export function ClientsPage() {
  const { clients, loading, error } = useClients()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ContactType | 'todos'>('todos')
  const [search, setSearch] = useState('')

  const filtered = clients.filter((c) => {
    const matchType = activeTab === 'todos' || c.clientType === activeTab
    const matchSearch =
      !search ||
      c.legalName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.tradeName ?? '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const counts = clients.reduce(
    (acc, c) => {
      acc[c.clientType] = (acc[c.clientType] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Directorio de clientes del despacho."
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.value
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.value !== 'todos' && counts[tab.value] ? (
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
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
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay clientes"
          description="Los clientes se crean automáticamente al convertir una solicitud en expediente."
        />
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {filtered.map((client) => (
              <div
                key={client.id}
                onClick={() => navigate('/app/clients/' + client.id)}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 transition-colors active:bg-slate-50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    {client.clientType === 'corporate'
                      ? <Building2 className="w-4 h-4 text-slate-500" />
                      : <User className="w-4 h-4 text-slate-500" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {client.legalName}
                    </p>
                    {client.tradeName && (
                      <p className="text-xs text-slate-500 truncate">
                        {client.tradeName}
                      </p>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-slate-400 shrink-0">
                    {client.clientType === 'individual' ? 'Particular' : 'Corporativo'}
                  </span>
                </div>
                <div className="flex items-center justify-between pl-12">
                  <p className="text-xs text-slate-600 truncate">{client.email}</p>
                  <p className="text-xs text-slate-400 shrink-0 ml-2">
                    {format(client.createdAt, 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Contacto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Alta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => navigate('/app/clients/' + client.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          {client.clientType === 'corporate'
                            ? <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            : <User className="w-3.5 h-3.5 text-slate-500" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {client.legalName}
                          </p>
                          {client.tradeName && (
                            <p className="text-xs text-slate-500">
                              {client.tradeName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {client.clientType === 'individual' ? 'Particular' : 'Corporativo'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{client.email}</p>
                      <p className="text-xs text-slate-500">{client.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {format(client.createdAt, 'dd MMM yyyy', { locale: es })}
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
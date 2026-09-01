import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Search } from 'lucide-react'
import { useContacts } from '@/hooks/useContacts'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CreateContactDialog } from './CreateContactDialog'
import { ROUTES } from '@/constants/routes'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function ContactsPage() {
  const { contacts, loading, error, create } = useContacts()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = contacts.filter((contact) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      contact.contactName.toLowerCase().includes(term) ||
      contact.referenceNumber.toLowerCase().includes(term) ||
      contact.contactEmail.toLowerCase().includes(term) ||
      (contact.companyName ?? '').toLowerCase().includes(term)
    )
  })

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <PageHeader
        title="Contactos"
        description="Personas y empresas con las que has hablado, con o sin presupuesto todavía."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo contacto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        }
      />

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, referencia, email o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay contactos"
          description={
            search
              ? 'No hay contactos que coincidan con la búsqueda.'
              : 'Cuando registres un contacto aparecerá aquí.'
          }
          action={
            !search ? (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear primer contacto
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {filtered.map((contact) => (
              <div
                key={contact.id}
                onClick={() => navigate(ROUTES.CONTACTS + '/' + contact.id)}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 transition-colors active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{contact.contactName}</p>
                    {contact.companyName && (
                      <p className="text-xs text-slate-500 truncate">{contact.companyName}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {contact.contactType === 'individual' ? 'Particular' : 'Empresa'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-2 truncate">{contact.contactEmail}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400">
                    {contact.referenceNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    {format(contact.createdAt, 'dd MMM yyyy', { locale: es })}
                  </span>
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
                    Referencia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Contacto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => navigate(ROUTES.CONTACTS + '/' + contact.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {contact.referenceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{contact.contactName}</div>
                      {contact.companyName && (
                        <div className="text-xs text-slate-500">{contact.companyName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {contact.contactEmail}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {contact.contactType === 'individual' ? 'Particular' : 'Empresa'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {format(contact.createdAt, 'dd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CreateContactDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (data) => {
          const id = await create(data)
          if (id) {
            setShowCreate(false)
            navigate(ROUTES.CONTACTS + '/' + id)
          }
        }}
      />
    </div>
  )
}

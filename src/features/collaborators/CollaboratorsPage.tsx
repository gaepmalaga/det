import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Handshake, Search, X } from 'lucide-react'
import { useCollaborators } from '@/hooks/useCollaborators'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CreateCollaboratorData } from '@/services/collaborators'

export function CollaboratorsPage() {
  const { collaborators, loading, error, create } = useCollaborators()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'inactivo'>('activo')
  const [form, setForm] = useState<CreateCollaboratorData>({
    legalName: '',
    tradeName: '',
    rnsp: '',
    taxId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    tipNumber: '',
    address: '',
    notes: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const id = await create({
        legalName: form.legalName,
        tradeName: form.tradeName || undefined,
        rnsp: form.rnsp,
        taxId: form.taxId || undefined,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        tipNumber: form.tipNumber || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      })
      if (id) {
        setShowForm(false)
        setForm({
          legalName: '',
          tradeName: '',
          rnsp: '',
          taxId: '',
          contactName: '',
          contactEmail: '',
          contactPhone: '',
          tipNumber: '',
          address: '',
          notes: '',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = collaborators.filter((c) => {
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    const matchSearch =
      !search ||
      c.legalName.toLowerCase().includes(search.toLowerCase()) ||
      c.rnsp.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      (c.tradeName ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const counts = collaborators.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        description="Despachos de detectives colaboradores externos."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo colaborador</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        }
      />

      {/* Formulario de creación */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">
              Nuevo despacho colaborador
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nombre / Razón social <span className="text-red-500">*</span>
                </label>
                <input
                  name="legalName"
                  value={form.legalName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Nombre del despacho"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nombre comercial
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </label>
                <input
                  name="tradeName"
                  value={form.tradeName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Nombre comercial"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  RNSP <span className="text-red-500">*</span>
                </label>
                <input
                  name="rnsp"
                  value={form.rnsp}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                  placeholder="Nº RNSP"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  NIF / CIF
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </label>
                <input
                  name="taxId"
                  value={form.taxId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                  placeholder="12345678A"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  TIP del detective
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </label>
                <input
                  name="tipNumber"
                  value={form.tipNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                  placeholder="D-XXXX"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-foreground mb-3">Datos de contacto</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Nombre de contacto <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Nombre y apellidos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="email@despacho.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contactPhone"
                    value={form.contactPhone}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="600 000 000"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Dirección
                <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Calle, número, ciudad..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Notas internas
                <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
                placeholder="Notas sobre este colaborador..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Añadir colaborador'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {([
          { value: 'activo', label: 'Activos' },
          { value: 'inactivo', label: 'Inactivos' },
          { value: 'todos', label: 'Todos' },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === tab.value
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
          placeholder="Buscar por nombre, RNSP o contacto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Sin colaboradores"
          description="Añade los despachos de detectives con los que colaboras habitualmente."
          action={
            !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir primer colaborador
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate('/app/collaborators/' + c.id)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-foreground/20 transition-colors active:bg-muted"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{c.legalName}</p>
                    {c.tradeName && (
                      <p className="text-xs text-muted-foreground truncate">{c.tradeName}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${
                    c.status === 'activo'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {c.status === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    RNSP: {c.rnsp}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                  </span>
                </div>
                {c.tipNumber && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    TIP: {c.tipNumber}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Despacho
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    RNSP
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    TIP
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Contacto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Alta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate('/app/collaborators/' + c.id)}
                    className="hover:bg-muted cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.legalName}</p>
                      {c.tradeName && (
                        <p className="text-xs text-muted-foreground">{c.tradeName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.rnsp}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                      {c.tipNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{c.contactName}</p>
                      <p className="text-xs text-muted-foreground">{c.contactEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        c.status === 'activo'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {c.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
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
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Handshake,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  UserCheck,
  UserX,
} from 'lucide-react'
import { useCollaboratorDetail } from '@/hooks/useCollaborators'
import { updateCollaborator } from '@/services/collaborators'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function CollaboratorDetailPage() {
  const { collaboratorId } = useParams<{ collaboratorId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { collaborator, loading, error, reload } = useCollaboratorDetail(
    collaboratorId ?? ''
  )
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
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

  const startEditing = () => {
    if (!collaborator) return
    setForm({
      legalName: collaborator.legalName,
      tradeName: collaborator.tradeName ?? '',
      rnsp: collaborator.rnsp,
      taxId: collaborator.taxId ?? '',
      contactName: collaborator.contactName,
      contactEmail: collaborator.contactEmail,
      contactPhone: collaborator.contactPhone,
      tipNumber: collaborator.tipNumber ?? '',
      address: collaborator.address ?? '',
      notes: collaborator.notes ?? '',
    })
    setEditing(true)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.firmId || !collaboratorId) return
    setSaving(true)
    try {
      await updateCollaborator(user.firmId, collaboratorId, {
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
      await reload()
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!user?.firmId || !collaboratorId || !collaborator) return
    const newStatus = collaborator.status === 'activo' ? 'inactivo' : 'activo'
    setSaving(true)
    try {
      await updateCollaborator(user.firmId, collaboratorId, { status: newStatus })
      await reload()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error || !collaborator) {
    return <p className="text-sm text-red-600">{error ?? 'No encontrado.'}</p>
  }

  return (
    <div>
      <button
        onClick={() => navigate('/app/collaborators')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a colaboradores
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Handshake className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground truncate">
                {collaborator.legalName}
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${
                collaborator.status === 'activo'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {collaborator.status === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {collaborator.tradeName && (
              <p className="text-sm text-muted-foreground">{collaborator.tradeName}</p>
            )}
            <p className="text-xs text-muted-foreground font-mono mt-1">
              RNSP: {collaborator.rnsp}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {!editing && (
            <button
              onClick={startEditing}
              className="px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Editar
            </button>
          )}
          <button
            onClick={handleToggleStatus}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
              collaborator.status === 'activo'
                ? 'text-red-600 border-red-200 hover:bg-red-50'
                : 'text-green-600 border-green-200 hover:bg-green-50'
            }`}
          >
            {collaborator.status === 'activo'
              ? <><UserX className="w-4 h-4" /> Desactivar</>
              : <><UserCheck className="w-4 h-4" /> Activar</>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Columna principal */}
        <div className="lg:col-span-2">
          {editing ? (
            <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Editar colaborador
              </h3>

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
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Nombre comercial
                  </label>
                  <input
                    name="tradeName"
                    value={form.tradeName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    NIF / CIF
                  </label>
                  <input
                    name="taxId"
                    value={form.taxId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    TIP
                  </label>
                  <input
                    name="tipNumber"
                    value={form.tipNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Contacto <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Dirección
                </label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Notas internas
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm">
              <div className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Identificación
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">RNSP</p>
                    <p className="text-sm font-mono text-foreground">{collaborator.rnsp}</p>
                  </div>
                  {collaborator.taxId && (
                    <div>
                      <p className="text-xs text-muted-foreground">NIF / CIF</p>
                      <p className="text-sm font-mono text-foreground uppercase">
                        {collaborator.taxId}
                      </p>
                    </div>
                  )}
                  {collaborator.tipNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">TIP</p>
                      <p className="text-sm font-mono text-foreground">
                        {collaborator.tipNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Contacto
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {collaborator.contactName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={'mailto:' + collaborator.contactEmail} className="text-sm text-primary hover:underline truncate">
                      {collaborator.contactEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={'tel:' + collaborator.contactPhone} className="text-sm text-foreground">
                      {collaborator.contactPhone}
                    </a>
                  </div>
                  {collaborator.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm text-foreground">{collaborator.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {collaborator.notes && (
                <div className="p-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Notas internas
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {collaborator.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {saved && (
            <p className="text-sm text-green-600 mt-3">
              Cambios guardados correctamente.
            </p>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Información
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Alta</p>
                <p className="text-sm text-foreground">
                  {format(collaborator.createdAt, "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última actualización</p>
                <p className="text-sm text-foreground">
                  {format(collaborator.updatedAt, "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  collaborator.status === 'activo'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {collaborator.status === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
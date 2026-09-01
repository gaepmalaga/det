import { useState } from 'react'
import { useFirmMembers } from '@/hooks/useFirm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ROLE_LABELS, ROLES_REQUIRING_TIP } from '@/constants/roles'
import { Plus, X, UserCheck, UserX } from 'lucide-react'
import type { FirmMemberRole } from '@/types'

const TIP_STATUS_COLORS = {
  active: 'bg-green-50 text-green-700 border-green-200',
  suspended: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
}

const TIP_STATUS_LABELS = {
  active: 'Activo',
  suspended: 'Suspendido',
  expired: 'Caducado',
}

export function TeamTab() {
  const { members, loading, add, update } = useFirmMembers()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    role: 'detective_senior' as FirmMemberRole,
    tipNumber: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const requiresTip = ROLES_REQUIRING_TIP.includes(form.role)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await add({
        displayName: form.displayName,
        email: form.email,
        role: form.role,
        tipNumber: form.tipNumber || undefined,
      })
      setForm({ displayName: '', email: '', role: 'detective_senior', tipNumber: '' })
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    await update(memberId, { isActive: !isActive })
  }

  if (loading) return <LoadingSpinner />

  const activeMembers = members.filter((m) => m.isActive)
  const inactiveMembers = members.filter((m) => !m.isActive)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Equipo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} activo{activeMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir miembro
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">Nuevo miembro</h4>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  name="displayName"
                  value={form.displayName}
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
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
                >
                  {Object.entries(ROLE_LABELS)
                    .filter(([key]) => key !== 'firm_owner')
                    .map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                </select>
              </div>
              {requiresTip && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Número de TIP <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="tipNumber"
                    value={form.tipNumber}
                    onChange={handleChange}
                    required={requiresTip}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                    placeholder="D-XXXX"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
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
                {submitting ? 'Añadiendo...' : 'Añadir miembro'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Miembro
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Rol
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                TIP
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Estado
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr key={member.id} className={member.isActive ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {member.displayName[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{member.displayName}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {ROLE_LABELS[member.role]}
                </td>
                <td className="px-4 py-3">
                  {member.tipNumber ? (
                    <div>
                      <p className="text-xs font-mono text-foreground">{member.tipNumber}</p>
                      {member.tipStatus && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border mt-0.5 ${TIP_STATUS_COLORS[member.tipStatus]}`}>
                          {TIP_STATUS_LABELS[member.tipStatus]}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {member.invitationStatus === 'pendiente' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                      Invitación pendiente
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      member.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {member.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {member.role !== 'firm_owner' && (
                    <button
                      onClick={() => handleToggleActive(member.id, member.isActive)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title={member.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {member.isActive
                        ? <UserX className="w-4 h-4" />
                        : <UserCheck className="w-4 h-4" />
                      }
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
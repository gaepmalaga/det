import { useState } from 'react'
import { useCasePortal } from '@/hooks/usePortal'
import { useAuth } from '@/contexts/AuthContext'
import { createAuditLog } from '@/services/auditLog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Plus, UserX } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case } from '@/types'

interface CasePortalTabProps {
  caseData: Case
}

export function CasePortalTab({ caseData }: CasePortalTabProps) {
  const { user } = useAuth()
  const { accesses, loading, error, grantAccess, revokeAccess } = useCasePortal(caseData.id)
  const [showAccessForm, setShowAccessForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [accessForm, setAccessForm] = useState({ email: '', name: '' })

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.firmId) return
    setSubmitting(true)
    try {
      await grantAccess(caseData.caseNumber, accessForm.email, accessForm.name)

      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'portal_access_granted',
        'Acceso al portal concedido a ' + accessForm.name,
        { email: accessForm.email }
      )

      setAccessForm({ email: '', name: '' })
      setShowAccessForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Acceso al portal</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            El cliente accede con el Gmail que indiques aquí y ve el estado de su
            presupuesto y expediente — sin mensajería ni documentos.
          </p>
        </div>
        <button
          onClick={() => setShowAccessForm(!showAccessForm)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Dar acceso
        </button>
      </div>

      {showAccessForm && (
        <form onSubmit={handleGrantAccess} className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nombre del cliente <span className="text-red-500">*</span>
              </label>
              <input
                value={accessForm.name}
                onChange={(e) => setAccessForm((p) => ({ ...p, name: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Nombre y apellidos"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email de Gmail <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={accessForm.email}
                onChange={(e) => setAccessForm((p) => ({ ...p, email: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="cliente@gmail.com"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAccessForm(false)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
              {submitting ? 'Dando acceso...' : 'Confirmar acceso'}
            </button>
          </div>
        </form>
      )}

      {accesses.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-400">Sin accesos configurados.</p>
        </div>
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {accesses.map((access) => (
              <div key={access.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{access.clientName}</p>
                    <p className="text-xs text-slate-500">{access.clientEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      access.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {access.isActive ? 'Activo' : 'Revocado'}
                    </span>
                    {access.isActive && (
                      <button onClick={() => revokeAccess(access.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Concedido el {format(access.createdAt, 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Concedido</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accesses.map((access) => (
                  <tr key={access.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{access.clientName}</td>
                    <td className="px-4 py-3 text-slate-600">{access.clientEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        access.isActive
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {access.isActive ? 'Activo' : 'Revocado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {format(access.createdAt, 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      {access.isActive && (
                        <button
                          onClick={() => revokeAccess(access.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Revocar acceso"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
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

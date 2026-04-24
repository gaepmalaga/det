import { useState } from 'react'
import { useCasePortal } from '@/hooks/usePortal'
import { useAuth } from '@/contexts/AuthContext'
import { createAuditLog } from '@/services/auditLog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Plus, FileText, MessageSquare, ExternalLink, UserX } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case } from '@/types'
import type { PortalDocument } from '@/services/portal'

interface CasePortalTabProps {
  caseData: Case
}

export function CasePortalTab({ caseData }: CasePortalTabProps) {
  const { user } = useAuth()
  const { accesses, documents, messages, loading, error, grantAccess, revokeAccess, release, send } =
    useCasePortal(caseData.id)
  const [showAccessForm, setShowAccessForm] = useState(false)
  const [showDocForm, setShowDocForm] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accessForm, setAccessForm] = useState({ email: '', name: '' })
  const [docForm, setDocForm] = useState({ name: '', url: '', type: 'contract' as PortalDocument['type'] })

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

  const handleReleaseDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.firmId) return
    setSubmitting(true)
    try {
      await release(docForm)

      await createAuditLog(
        user.firmId,
        caseData.id,
        user.uid,
        user.displayName || '',
        'portal_document_released',
        'Documento liberado al cliente: ' + docForm.name,
        { type: docForm.type }
      )

      setDocForm({ name: '', url: '', type: 'contract' })
      setShowDocForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSubmitting(true)
    try {
      await send(newMessage, false, 'Despacho')
      setNewMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const activeAccesses = accesses.filter((a) => a.isActive)

  return (
    <div className="space-y-8">

      {/* Accesos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Acceso al portal</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              El cliente accede con el Gmail que indiques aquí.
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

      {/* Documentos liberados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Documentos liberados</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Solo los documentos que liberes aquí serán visibles para el cliente.
            </p>
          </div>
          {activeAccesses.length > 0 && (
            <button
              onClick={() => setShowDocForm(!showDocForm)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Liberar documento
            </button>
          )}
        </div>

        {showDocForm && (
          <form onSubmit={handleReleaseDoc} className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nombre del documento <span className="text-red-500">*</span>
                </label>
                <input
                  value={docForm.name}
                  onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Ej: Contrato de servicios"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Tipo</label>
                <select
                  value={docForm.type}
                  onChange={(e) => setDocForm((p) => ({ ...p, type: e.target.value as PortalDocument['type'] }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="contract">Contrato</option>
                  <option value="report">Informe</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                URL del documento <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={docForm.url}
                onChange={(e) => setDocForm((p) => ({ ...p, url: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="https://..."
              />
              <p className="text-xs text-slate-400 mt-1">
                Pega la URL del documento ya subido (contrato escaneado, informe, etc.)
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowDocForm(false)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
                {submitting ? 'Liberando...' : 'Liberar documento'}
              </button>
            </div>
          </form>
        )}

        {documents.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm text-slate-400">Sin documentos liberados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{document.name}</p>
                    <p className="text-xs text-slate-500">
                      Liberado el {format(document.releasedAt, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <a href={document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0 ml-3">
                  <ExternalLink className="w-3 h-3" />
                  Ver
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Mensajes</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comunicación directa con el cliente a través del portal.
            </p>
          </div>
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {showMessages ? 'Ocultar' : `Ver mensajes (${messages.length})`}
          </button>
        </div>

        {showMessages && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-slate-200 rounded-xl">
                <p className="text-sm text-slate-400">Sin mensajes.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.fromClient ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-xl text-sm ${
                      msg.fromClient ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
                    }`}>
                      <p className="text-xs font-medium mb-1 opacity-70">{msg.senderName}</p>
                      <p>{msg.content}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {format(msg.createdAt, 'dd MMM HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeAccesses.length > 0 && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Escribe un mensaje al cliente..."
                />
                <button
                  type="submit"
                  disabled={submitting || !newMessage.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
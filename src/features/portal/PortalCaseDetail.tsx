import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, MessageSquare, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getCase } from '@/services/cases'
import { getCasePortalDocuments, getCaseMessages, sendMessage } from '@/services/portal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CaseStatusBadge } from '@/components/shared/StatusBadge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case } from '@/types'
import type { PortalDocument, PortalMessage } from '@/services/portal'

export function PortalCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const [searchParams] = useSearchParams()
  const firmId = searchParams.get('firmId')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [documents, setDocuments] = useState<PortalDocument[]>([])
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!firmId || !caseId) return
    const load = async () => {
      setLoading(true)
      try {
        const [c, docs, msgs] = await Promise.all([
          getCase(firmId, caseId),
          getCasePortalDocuments(firmId, caseId),
          getCaseMessages(firmId, caseId),
        ])
        setCaseData(c)
        setDocuments(docs)
        setMessages(msgs)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [firmId, caseId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firmId || !caseId || !newMessage.trim() || !user) return
    setSending(true)
    try {
      await sendMessage(firmId, caseId, newMessage, true, user.displayName || 'Cliente')
      const msgs = await getCaseMessages(firmId, caseId)
      setMessages(msgs)
      setNewMessage('')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!caseData) return <p className="text-sm text-red-600">Expediente no encontrado.</p>

  return (
    <div>
      <button
        onClick={() => navigate('/portal/cases')}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a mis expedientes
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-xs text-slate-400">{caseData.caseNumber}</span>
          <CaseStatusBadge status={caseData.status} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">{caseData.investigationType}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Abierto el {format(caseData.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Documentos
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-400">
              El despacho aún no ha compartido documentos contigo.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => (
                <a key={document.id} href={document.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{document.name}</p>
                      <p className="text-xs text-slate-500">
                        {format(document.releasedAt, 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-primary">Descargar</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            Mensajes
          </h2>

          <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400">Sin mensajes aún.</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.fromClient ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.fromClient ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                    <p className="text-xs font-medium mb-0.5 opacity-70">{msg.senderName}</p>
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {format(msg.createdAt, 'dd MMM HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Escribe un mensaje..."
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="p-2 text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
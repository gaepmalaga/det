import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, Plus, Receipt } from 'lucide-react'
import { useContactDetail } from '@/hooks/useContacts'
import { useContactQuotes } from '@/hooks/useQuotes'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { CreateQuoteDialog } from '@/features/quotes/CreateQuoteDialog'
import { QuoteCard } from '@/features/quotes/QuoteCard'
import { AcceptQuoteDialog } from '@/features/quotes/AcceptQuoteDialog'
import { ROUTES } from '@/constants/routes'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Quote } from '@/types'

export function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()
  const { contact, loading, error } = useContactDetail(contactId ?? '')
  const { quotes, loading: quotesLoading, create, reject, markSent, uploadDocument } = useContactQuotes(contactId ?? '')
  const [showCreateQuote, setShowCreateQuote] = useState(false)
  const [acceptingQuote, setAcceptingQuote] = useState<Quote | null>(null)

  if (loading) return <LoadingSpinner />
  if (error || !contact) {
    return <p className="text-sm text-red-600">{error ?? 'No encontrado.'}</p>
  }

  return (
    <div>
      <button
        onClick={() => navigate(ROUTES.CONTACTS)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a contactos
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">{contact.referenceNumber}</span>
          <span className="text-xs text-muted-foreground">
            {contact.contactType === 'individual' ? 'Particular' : 'Empresa'}
          </span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">{contact.contactName}</h1>
        {contact.companyName && (
          <p className="text-sm text-muted-foreground mt-0.5">{contact.companyName}</p>
        )}
      </div>

      {/* Contenido: 1 col móvil, 3 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna principal — presupuestos */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Presupuestos
            </h2>
            <button
              onClick={() => setShowCreateQuote(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo presupuesto
            </button>
          </div>

          {quotesLoading ? (
            <LoadingSpinner />
          ) : quotes.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Sin presupuestos"
              description="Envía un presupuesto a este contacto para empezar."
            />
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onSend={() => markSent(quote.id)}
                  onAccept={() => setAcceptingQuote(quote)}
                  onReject={(reason) => reject(quote.id, reason)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Contacto
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a href={'mailto:' + contact.contactEmail} className="text-sm text-primary hover:underline truncate">
                  {contact.contactEmail}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a href={'tel:' + contact.contactPhone} className="text-sm text-foreground">
                  {contact.contactPhone}
                </a>
              </div>
            </div>
          </div>

          {contact.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-amber-900 mb-2">Notas internas</h2>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">Información</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Fecha de alta</p>
                <p className="text-sm text-foreground">
                  {format(contact.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateQuoteDialog
        open={showCreateQuote}
        contacts={[contact]}
        lockedContactId={contact.id}
        onClose={() => setShowCreateQuote(false)}
        onCreate={async (data, file) => {
          const id = await create(data)
          if (id) {
            if (file) await uploadDocument(id, file)
            setShowCreateQuote(false)
          }
        }}
      />

      {acceptingQuote && (
        <AcceptQuoteDialog
          open={true}
          quote={acceptingQuote}
          contact={contact}
          onClose={() => setAcceptingQuote(null)}
          onDone={() => {
            setAcceptingQuote(null)
            navigate(ROUTES.CONTRACTS)
          }}
        />
      )}
    </div>
  )
}

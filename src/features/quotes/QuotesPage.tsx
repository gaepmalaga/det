import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Receipt, Search } from 'lucide-react'
import { useQuotes } from '@/hooks/useQuotes'
import { useContacts } from '@/hooks/useContacts'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CreateQuoteDialog } from './CreateQuoteDialog'
import { QuoteCard } from './QuoteCard'
import { AcceptQuoteDialog } from './AcceptQuoteDialog'
import { ROUTES } from '@/constants/routes'
import type { Quote, QuoteStatus } from '@/types'

const STATUS_TABS: { label: string; value: QuoteStatus | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Enviados', value: 'enviado' },
  { label: 'Aceptados', value: 'aceptado' },
  { label: 'Rechazados', value: 'rechazado' },
]

export function QuotesPage() {
  const { quotes, loading, error, create, reject, uploadDocument } = useQuotes()
  const { contacts, loading: contactsLoading } = useContacts()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<QuoteStatus | 'todos'>('todos')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [acceptingQuote, setAcceptingQuote] = useState<Quote | null>(null)

  const contactsById = useMemo(() => {
    const map = new Map(contacts.map((c) => [c.id, c]))
    return map
  }, [contacts])

  const filtered = quotes.filter((quote) => {
    const matchStatus = activeTab === 'todos' || quote.status === activeTab
    if (!matchStatus) return false
    if (!search) return true
    const term = search.toLowerCase()
    const contactName = contactsById.get(quote.contactId)?.contactName ?? ''
    return (
      contactName.toLowerCase().includes(term) ||
      quote.quoteNumber.toLowerCase().includes(term) ||
      quote.investigationType.toLowerCase().includes(term)
    )
  })

  const counts = quotes.reduce(
    (acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (loading || contactsLoading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const acceptingContact = acceptingQuote ? contactsById.get(acceptingQuote.contactId) : undefined

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description="Pipeline comercial: presupuestos enviados, aceptados y rechazados."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo presupuesto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        }
      />

      {/* Tabs de estado */}
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.value
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
          placeholder="Buscar por contacto, referencia o tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No hay presupuestos"
          description={
            activeTab === 'todos'
              ? 'Cuando envíes un presupuesto aparecerá aquí.'
              : 'No hay presupuestos con este estado.'
          }
          action={
            activeTab === 'todos' ? (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear primer presupuesto
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              contactName={contactsById.get(quote.contactId)?.contactName}
              onContactClick={() => navigate('/app/contacts/' + quote.contactId)}
              onAccept={() => setAcceptingQuote(quote)}
              onReject={(reason) => reject(quote.id, reason)}
            />
          ))}
        </div>
      )}

      <CreateQuoteDialog
        open={showCreate}
        contacts={contacts}
        onClose={() => setShowCreate(false)}
        onCreate={async (data, file) => {
          const id = await create(data)
          if (id) {
            if (file) await uploadDocument(id, file)
            setShowCreate(false)
          }
        }}
      />

      {acceptingQuote && acceptingContact && (
        <AcceptQuoteDialog
          open={true}
          quote={acceptingQuote}
          contact={acceptingContact}
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

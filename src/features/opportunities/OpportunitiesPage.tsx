import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Handshake, Receipt, ArrowRight } from 'lucide-react'
import { useContacts } from '@/hooks/useContacts'
import { useQuotes } from '@/hooks/useQuotes'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CreateContactDialog } from '@/features/contacts/CreateContactDialog'
import { CreateQuoteDialog } from '@/features/quotes/CreateQuoteDialog'
import { AcceptQuoteDialog } from '@/features/quotes/AcceptQuoteDialog'
import {
  buildOpportunities,
  STAGE_LABELS,
  STAGE_HINTS,
  STAGE_ORDER,
  type OpportunityStage,
} from '@/services/pipeline'
import { ROUTES } from '@/constants/routes'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Quote } from '@/types'

const STAGE_STYLES: Record<OpportunityStage, string> = {
  nuevo: 'bg-primary/10 text-primary border-primary/20',
  presupuestado: 'bg-amber-50 text-amber-800 border-amber-200',
  ganado: 'bg-green-50 text-green-700 border-green-200',
  perdido: 'bg-muted text-muted-foreground border-border',
}

// Antes esto eran dos pantallas: Contactos, donde salían todos revueltos
// —el que llamó ayer y el que ya lleva tres asuntos—, y Presupuestos.
// Pero un presupuesto no existe sin alguien que lo pidió: son la misma
// cosa vista en dos momentos.
export function OpportunitiesPage() {
  const navigate = useNavigate()
  const { contacts, loading: loadingContacts, create: createContact } = useContacts()
  const {
    quotes,
    loading: loadingQuotes,
    create: createQuote,
    reject: rejectQuote,
    uploadDocument,
  } = useQuotes()
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<OpportunityStage | 'todas'>('todas')
  const [showContact, setShowContact] = useState(false)
  const [quoteFor, setQuoteFor] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<Quote | null>(null)

  const opportunities = useMemo(
    () => buildOpportunities(contacts, quotes),
    [contacts, quotes]
  )

  const counts = useMemo(() => {
    const map = new Map<OpportunityStage, number>()
    opportunities.forEach((o) => map.set(o.stage, (map.get(o.stage) ?? 0) + 1))
    return map
  }, [opportunities])

  const term = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      opportunities
        .filter((o) => stage === 'todas' || o.stage === stage)
        .filter(
          (o) =>
            !term ||
            [o.contact.contactName, o.contact.companyName, o.contact.contactEmail, o.contact.contactPhone]
              .join(' ')
              .toLowerCase()
              .includes(term)
        )
        .sort((a, b) => {
          const byStage = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
          return byStage !== 0
            ? byStage
            : b.lastActivity.getTime() - a.lastActivity.getTime()
        }),
    [opportunities, stage, term]
  )

  if (loadingContacts || loadingQuotes) return <LoadingSpinner />

  return (
    <div className="pb-8">
      <PageHeader
        title="Oportunidades"
        description="Quien pregunta, quien tiene precio y quien ya ha contratado."
        action={
          <button
            onClick={() => setShowContact(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva consulta</span>
          </button>
        }
      />

      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {(['todas', ...STAGE_ORDER] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              stage === s
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'todas' ? 'Todas' : STAGE_LABELS[s]}
            <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
              {s === 'todas' ? opportunities.length : (counts.get(s) ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {stage !== 'todas' && (
        <p className="text-xs text-muted-foreground mb-4">{STAGE_HINTS[stage]}</p>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, empresa, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={opportunities.length === 0 ? 'Sin oportunidades' : 'Nada por aquí'}
          description={
            opportunities.length === 0
              ? 'Cada persona que pregunta por un servicio entra aquí, y avanza sola según se le envía y acepta el presupuesto.'
              : 'Ninguna oportunidad coincide con este filtro.'
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div
              key={o.contact.id}
              onClick={() => navigate(`/app/contacts/${o.contact.id}`)}
              className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                  {o.contact.referenceNumber}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {o.contact.contactName}
                    </p>
                    {o.contact.companyName && (
                      <p className="text-xs text-muted-foreground">
                        {o.contact.companyName}
                      </p>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STAGE_STYLES[o.stage]}`}
                    >
                      {STAGE_LABELS[o.stage]}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.contact.contactEmail}
                    {o.contact.contactPhone && ` · ${o.contact.contactPhone}`}
                  </p>

                  {o.quotes.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {o.quotes.map((q) => (
                        <li
                          key={q.id}
                          className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground"
                        >
                          <Receipt className="w-3 h-3 shrink-0" />
                          <span className="font-mono">{q.quoteNumber}</span>
                          <span className="tabular-nums">{q.amount} €</span>
                          <span>·</span>
                          <span>{q.status}</span>
                          <span className="hidden sm:inline">
                            · {format(q.createdAt, 'dd/MM/yyyy', { locale: es })}
                          </span>

                          {/* Aceptar es el paso que convierte una consulta
                              en cliente con contrato y expediente, así que
                              tiene que estar aquí y no en otra pantalla. */}
                          {q.status === 'enviado' && (
                            <span className="flex items-center gap-1.5 ml-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setAccepting(q)
                                }}
                                className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                              >
                                Aceptar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  rejectQuote(q.id)
                                }}
                                className="px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border rounded hover:bg-muted transition-colors"
                              >
                                Rechazar
                              </button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* La acción que toca en cada estado, sin tener que entrar. */}
                {o.stage === 'nuevo' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setQuoteFor(o.contact.id)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Presupuestar
                  </button>
                ) : (
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateContactDialog
        open={showContact}
        onClose={() => setShowContact(false)}
        onCreate={async (data) => {
          await createContact(data)
          setShowContact(false)
        }}
      />

      {quoteFor && (
        <CreateQuoteDialog
          open={true}
          contacts={contacts}
          lockedContactId={quoteFor}
          onClose={() => setQuoteFor(null)}
          onCreate={async (data, file) => {
            const id = await createQuote(data)
            if (!id) return
            if (file) await uploadDocument(id, file)
            setQuoteFor(null)
          }}
        />
      )}

      {accepting && (
        <AcceptQuoteDialog
          open={true}
          quote={accepting}
          contact={contacts.find((c) => c.id === accepting.contactId)!}
          onClose={() => setAccepting(null)}
          onDone={() => {
            setAccepting(null)
            navigate(ROUTES.CONTRACTS)
          }}
        />
      )}
    </div>
  )
}

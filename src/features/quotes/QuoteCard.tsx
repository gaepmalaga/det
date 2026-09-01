import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { QuoteStatusBadge } from '@/components/shared/StatusBadge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Quote } from '@/types'

interface QuoteCardProps {
  quote: Quote
  contactName?: string
  onContactClick?: () => void
  onAccept: () => void
  onReject: (reason?: string) => void
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

export function QuoteCard({ quote, contactName, onContactClick, onAccept, onReject }: QuoteCardProps) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const isPending = quote.status === 'enviado'

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-slate-400">{quote.quoteNumber}</span>
            <QuoteStatusBadge status={quote.status} />
          </div>
          {contactName && (
            onContactClick ? (
              <button
                onClick={onContactClick}
                className="text-sm font-medium text-primary hover:underline truncate block"
              >
                {contactName}
              </button>
            ) : (
              <p className="text-sm font-medium text-slate-900 truncate">{contactName}</p>
            )
          )}
          <p className="text-xs text-slate-600 mt-0.5">
            {quote.investigationType}
            {quote.investigationTypeCustom && (
              <span className="text-slate-400 ml-1">— {quote.investigationTypeCustom}</span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-slate-900">
            {currencyFormatter.format(quote.amount)}
          </p>
          <p className="text-xs text-slate-400">
            {format(quote.createdAt, 'dd MMM yyyy', { locale: es })}
          </p>
        </div>
      </div>

      {quote.description && (
        <p className="text-xs text-slate-600 whitespace-pre-wrap mb-3">{quote.description}</p>
      )}

      {quote.status === 'rechazado' && quote.rejectionReason && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          Motivo: {quote.rejectionReason}
        </p>
      )}

      {isPending && !showRejectForm && (
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Aceptar
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Rechazar
          </button>
        </div>
      )}

      {showRejectForm && (
        <div className="pt-2 border-t border-slate-100">
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-2"
            placeholder="Motivo del rechazo (opcional)..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectForm(false)}
              className="flex-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onReject(rejectionReason || undefined)
                setShowRejectForm(false)
              }}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Confirmar rechazo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

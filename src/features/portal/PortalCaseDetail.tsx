import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt } from 'lucide-react'
import { getCase } from '@/services/cases'
import { getQuote } from '@/services/quotes'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case, Quote } from '@/types'

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

export function PortalCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const [searchParams] = useSearchParams()
  const firmId = searchParams.get('firmId')
  const navigate = useNavigate()

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firmId || !caseId) return
    const load = async () => {
      setLoading(true)
      try {
        const c = await getCase(firmId, caseId)
        setCaseData(c)
        setQuote(c?.quoteId ? await getQuote(firmId, c.quoteId) : null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [firmId, caseId])

  if (loading) return <LoadingSpinner />
  if (!caseData) return <p className="text-sm text-red-600">Expediente no encontrado.</p>

  const isOpen = !['cerrado', 'archivado'].includes(caseData.status)

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
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <span className="font-mono text-xs text-slate-400">{caseData.caseNumber}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
              isOpen
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {isOpen ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">{caseData.investigationType}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Abierto el {format(caseData.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-xl">
        {quote && (
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-700">Presupuesto {quote.quoteNumber}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {currencyFormatter.format(quote.amount)}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500 mb-1">Objeto del encargo</p>
          <p className="text-sm text-slate-900 whitespace-pre-wrap">
            {caseData.objectScope || caseData.description}
          </p>
        </div>
      </div>
    </div>
  )
}

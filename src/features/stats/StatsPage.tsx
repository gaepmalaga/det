import { useMemo } from 'react'
import { TrendingUp, Receipt, FolderOpen, Percent } from 'lucide-react'
import { useQuotes } from '@/hooks/useQuotes'
import { useCases } from '@/hooks/useCases'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CASE_STATUS_LABELS } from '@/constants/cases'
import { format, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CaseStatus } from '@/types'

const ACTIVE_STATUSES: CaseStatus[] = [
  'revision',
  'presupuesto',
  'contrato_pendiente',
  'activo',
  'suspendido',
  'trabajo_terminado',
]

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

function monthKey(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function StatsPage() {
  const { quotes, loading: quotesLoading } = useQuotes()
  const { cases, loading: casesLoading } = useCases()

  const loading = quotesLoading || casesLoading

  const months = useMemo(() => {
    const now = startOfMonth(new Date())
    return Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)))
  }, [])

  const quotesByMonth = useMemo(() => {
    return months.map((month) => {
      const key = monthKey(month)
      const inMonth = quotes.filter((q) => monthKey(q.createdAt) === key)
      return {
        month,
        enviados: inMonth.length,
        aceptados: inMonth.filter((q) => q.status === 'aceptado').length,
        rechazados: inMonth.filter((q) => q.status === 'rechazado').length,
      }
    })
  }, [quotes, months])

  const maxQuotesInMonth = Math.max(1, ...quotesByMonth.map((m) => m.enviados))

  const totalDecided = quotes.filter((q) => q.status !== 'enviado').length
  const totalAccepted = quotes.filter((q) => q.status === 'aceptado').length
  const conversionRate = totalDecided > 0 ? Math.round((totalAccepted / totalDecided) * 100) : 0

  const activeCases = cases.filter((c) => ACTIVE_STATUSES.includes(c.status))
  const closedCases = cases.filter((c) => c.status === 'cerrado' || c.status === 'archivado')

  const amountByType = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of quotes) {
      if (q.status !== 'aceptado') continue
      map.set(q.investigationType, (map.get(q.investigationType) ?? 0) + q.amount)
    }
    for (const c of cases) {
      if (c.billingMode !== 'framework' || !c.agreedAmount) continue
      map.set(c.investigationType, (map.get(c.investigationType) ?? 0) + c.agreedAmount)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [quotes, cases])

  const maxAmountByType = Math.max(1, ...amountByType.map(([, amount]) => amount))

  const casesByStatus = useMemo(() => {
    const map = new Map<CaseStatus, number>()
    for (const c of cases) {
      map.set(c.status, (map.get(c.status) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [cases])

  const maxCasesByStatus = Math.max(1, ...casesByStatus.map(([, count]) => count))

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Estadísticas"
        description="Vista agregada de presupuestos y expedientes — sin datos de facturación."
      />

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Presupuestos enviados
            </p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </span>
          </div>
          <p className="text-[1.75rem] leading-none font-semibold text-foreground">{quotes.length}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Tasa de conversión
            </p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <Percent className="w-4 h-4 text-muted-foreground" />
            </span>
          </div>
          <p className="text-[1.75rem] leading-none font-semibold text-foreground">{conversionRate}%</p>
          <p className="text-xs text-muted-foreground mt-2">
            {totalAccepted} de {totalDecided} decididos
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Expedientes activos
            </p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
            </span>
          </div>
          <p className="text-[1.75rem] leading-none font-semibold text-foreground">{activeCases.length}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Expedientes cerrados
            </p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </span>
          </div>
          <p className="text-[1.75rem] leading-none font-semibold text-foreground">{closedCases.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Presupuestos por mes */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Presupuestos por mes</h2>
          <div className="space-y-3">
            {quotesByMonth.map(({ month, enviados, aceptados, rechazados }) => (
              <div key={monthKey(month)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground capitalize">
                    {format(month, 'MMMM yyyy', { locale: es })}
                  </span>
                  <span className="text-xs text-muted-foreground">{enviados}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                  {enviados > 0 && (
                    <>
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(aceptados / maxQuotesInMonth) * 100}%` }}
                        title={`${aceptados} aceptados`}
                      />
                      <div
                        className="h-full bg-red-400"
                        style={{ width: `${(rechazados / maxQuotesInMonth) * 100}%` }}
                        title={`${rechazados} rechazados`}
                      />
                      <div
                        className="h-full bg-border"
                        style={{
                          width: `${((enviados - aceptados - rechazados) / maxQuotesInMonth) * 100}%`,
                        }}
                        title={`${enviados - aceptados - rechazados} pendientes`}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" /> Aceptados
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Rechazados
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-border" /> Pendientes
            </span>
          </div>
        </div>

        {/* Importe por tipo de investigación */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Importe acordado por tipo de investigación
          </h2>
          {amountByType.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin presupuestos aceptados todavía.</p>
          ) : (
            <div className="space-y-3">
              {amountByType.map(([type, amount]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-xs text-foreground truncate">{type}</span>
                    <span className="text-xs font-medium text-foreground shrink-0">
                      {currencyFormatter.format(amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-brand-gold"
                      style={{ width: `${(amount / maxAmountByType) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expedientes por estado */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-4">Expedientes por estado</h2>
          {casesByStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay expedientes.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {casesByStatus.map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground">{CASE_STATUS_LABELS[status]}</span>
                    <span className="text-xs font-medium text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(count / maxCasesByStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

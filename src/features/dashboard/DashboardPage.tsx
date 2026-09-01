import { useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Receipt,
  Users,
  ShieldAlert,
  FileText,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCases } from '@/hooks/useCases'
import { useQuotes } from '@/hooks/useQuotes'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CaseStatusBadge } from '@/components/shared/StatusBadge'
import { ROUTES } from '@/constants/routes'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { cases, loading: casesLoading } = useCases()
  const { quotes, loading: quotesLoading } = useQuotes()

  const loading = casesLoading || quotesLoading

  if (loading) return <LoadingSpinner />

  const activeCases = cases.filter((c) =>
    ['revision', 'presupuesto', 'contrato_pendiente', 'activo', 'suspendido', 'trabajo_terminado'].includes(c.status)
  )
  const pendingQuotes = quotes.filter((q) => q.status === 'enviado')
  const redCases = cases.filter((c) => c.complianceStatus === 'red')
  const amberCases = cases.filter((c) => c.complianceStatus === 'amber')
  const recentCases = [...activeCases].slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div
          onClick={() => navigate(ROUTES.CASES)}
          className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-foreground/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Expedientes activos
            </p>
            <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{activeCases.length}</p>
        </div>

        <div
          onClick={() => navigate(ROUTES.QUOTES)}
          className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-foreground/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Presupuestos pendientes
            </p>
            <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{pendingQuotes.length}</p>
        </div>

        <div
          onClick={() => navigate(ROUTES.COMPLIANCE)}
          className={`border rounded-xl p-4 cursor-pointer transition-colors ${
            redCases.length > 0
              ? 'bg-red-50 border-red-200 hover:border-red-300'
              : 'bg-card border-border hover:border-foreground/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-medium uppercase tracking-wide leading-tight ${
              redCases.length > 0 ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              Alertas críticas
            </p>
            <ShieldAlert className={`w-4 h-4 shrink-0 ${
              redCases.length > 0 ? 'text-red-500' : 'text-muted-foreground'
            }`} />
          </div>
          <p className={`text-3xl font-semibold ${
            redCases.length > 0 ? 'text-red-700' : 'text-foreground'
          }`}>
            {redCases.length}
          </p>
          {amberCases.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {amberCases.length} en revisión
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Total expedientes
            </p>
            <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{cases.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {cases.filter((c) => c.status === 'cerrado').length} cerrados
          </p>
        </div>
      </div>

      {/* Grid principal: 1 col móvil, 3 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Expedientes activos recientes — ocupa 2 cols en desktop */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                Expedientes activos
              </h2>
              <button
                onClick={() => navigate(ROUTES.CASES)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver todos
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {recentCases.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay expedientes activos.</p>
                <button
                  onClick={() => navigate(ROUTES.CONTACTS)}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Ir a contactos
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate('/app/cases/' + c.id)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted cursor-pointer transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          c.complianceStatus === 'green'
                            ? 'bg-green-500'
                            : c.complianceStatus === 'amber'
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {c.investigationType}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{c.caseNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CaseStatusBadge status={c.status} />
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(c.createdAt, 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">

          {/* Presupuestos pendientes */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                Presupuestos
              </h2>
              <button
                onClick={() => navigate(ROUTES.QUOTES)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Ver todos
              </button>
            </div>
            {pendingQuotes.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">Sin presupuestos pendientes.</p>
            ) : (
              <div className="divide-y divide-border">
                {pendingQuotes.slice(0, 4).map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => navigate(ROUTES.QUOTES)}
                    className="px-4 py-3 hover:bg-muted cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {quote.investigationType}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{quote.quoteNumber}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acceso rápido */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Acceso rápido</h2>
            <div className="space-y-1">
              <button
                onClick={() => navigate(ROUTES.CONTACTS)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                Nuevo contacto
              </button>
              <button
                onClick={() => navigate(ROUTES.CASES)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors text-left"
              >
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                Ver expedientes
              </button>
              <button
                onClick={() => navigate(ROUTES.REGISTRY_BOOK)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                Libro-registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
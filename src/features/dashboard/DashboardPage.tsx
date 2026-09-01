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

  const firstName = user?.displayName?.split(' ')[0]

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {firstName ? `Hola, ${firstName}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div
          onClick={() => navigate(ROUTES.CASES)}
          className="group bg-card border border-border rounded-xl p-4 cursor-pointer shadow-sm hover:shadow-md hover:border-primary/25 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Expedientes activos
            </p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
              <FolderOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </span>
          </div>
          <p className="text-[1.75rem] leading-none font-semibold text-foreground">{activeCases.length}</p>
        </div>

        <div
          onClick={() => navigate(ROUTES.QUOTES)}
          className="group bg-card border border-border rounded-xl p-4 cursor-pointer shadow-sm hover:shadow-md hover:border-primary/25 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Presupuestos pendientes
            </p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
              <Receipt className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </span>
          </div>
          <p className="text-[1.75rem] leading-none font-semibold text-foreground">{pendingQuotes.length}</p>
        </div>

        <div
          onClick={() => navigate(ROUTES.COMPLIANCE)}
          className={`border rounded-xl p-4 cursor-pointer shadow-sm hover:shadow-md transition-all ${
            redCases.length > 0
              ? 'bg-red-50 border-red-200 hover:border-red-300'
              : 'bg-card border-border hover:border-primary/25'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className={`text-xs font-medium uppercase tracking-wide leading-tight ${
              redCases.length > 0 ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              Alertas críticas
            </p>
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
              redCases.length > 0 ? 'bg-red-100' : 'bg-muted'
            }`}>
              <ShieldAlert className={`w-4 h-4 ${
                redCases.length > 0 ? 'text-red-500' : 'text-muted-foreground'
              }`} />
            </span>
          </div>
          <p className={`text-[1.75rem] leading-none font-semibold ${
            redCases.length > 0 ? 'text-red-700' : 'text-foreground'
          }`}>
            {redCases.length}
          </p>
          {amberCases.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              {amberCases.length} en revisión
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Total expedientes
            </p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </span>
          </div>
          <p className="text-[1.75rem] leading-none font-semibold text-foreground">{cases.length}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {cases.filter((c) => c.status === 'cerrado').length} cerrados
          </p>
        </div>
      </div>

      {/* Grid principal: 1 col móvil, 3 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Expedientes activos recientes — ocupa 2 cols en desktop */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                </span>
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
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 shrink-0">
                  <Receipt className="w-3.5 h-3.5 text-primary" />
                </span>
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
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">Acceso rápido</h2>
            <div className="space-y-1">
              <button
                onClick={() => navigate(ROUTES.CONTACTS)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors text-left"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted shrink-0">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
                Nuevo contacto
              </button>
              <button
                onClick={() => navigate(ROUTES.CASES)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors text-left"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
                Ver expedientes
              </button>
              <button
                onClick={() => navigate(ROUTES.REGISTRY_BOOK)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors text-left"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted shrink-0">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
                Libro-registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
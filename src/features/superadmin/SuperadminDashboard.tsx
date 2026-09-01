import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { getPlatformMetrics, type SuperadminMetrics } from '@/services/superadmin'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG = {
  trial: {
    label: 'Trial',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  active: {
    label: 'Activo',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: CheckCircle,
  },
  suspended: {
    label: 'Suspendido',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-muted',
    border: 'border-border',
    text: 'text-muted-foreground',
    icon: XCircle,
  },
}

export function SuperadminDashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<SuperadminMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlatformMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!metrics) return <p className="text-sm text-red-600">Error al cargar métricas.</p>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Panel de control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          onClick={() => navigate('/superadmin/firms')}
          className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-foreground/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total despachos
            </p>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold text-foreground">
            {metrics.totalFirms}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Usuarios totales
            </p>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold text-foreground">
            {metrics.totalMembers}
          </p>
        </div>

        <div className={`rounded-xl p-5 border ${
          metrics.activeFirms > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-card border-border'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-xs font-medium uppercase tracking-wide ${
              metrics.activeFirms > 0 ? 'text-green-600' : 'text-muted-foreground'
            }`}>
              Activos
            </p>
            <CheckCircle className={`w-4 h-4 ${
              metrics.activeFirms > 0 ? 'text-green-500' : 'text-muted-foreground'
            }`} />
          </div>
          <p className={`text-3xl font-semibold ${
            metrics.activeFirms > 0 ? 'text-green-700' : 'text-foreground'
          }`}>
            {metrics.activeFirms}
          </p>
        </div>

        <div className={`rounded-xl p-5 border ${
          metrics.trialFirms > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-card border-border'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-xs font-medium uppercase tracking-wide ${
              metrics.trialFirms > 0 ? 'text-amber-600' : 'text-muted-foreground'
            }`}>
              En trial
            </p>
            <Clock className={`w-4 h-4 ${
              metrics.trialFirms > 0 ? 'text-amber-500' : 'text-muted-foreground'
            }`} />
          </div>
          <p className={`text-3xl font-semibold ${
            metrics.trialFirms > 0 ? 'text-amber-700' : 'text-foreground'
          }`}>
            {metrics.trialFirms}
          </p>
        </div>
      </div>

      {/* Despachos recientes */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Despachos recientes
          </h2>
          <button
            onClick={() => navigate('/superadmin/firms')}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todos
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {metrics.recentFirms.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay despachos registrados en los últimos 30 días.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Despacho
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  RNSP
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Plan
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Alta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.recentFirms.map((firm) => {
                const config = STATUS_CONFIG[firm.status] ?? STATUS_CONFIG.trial
                return (
                  <tr
                    key={firm.id}
                    onClick={() => navigate('/superadmin/firms/' + firm.id)}
                    className="hover:bg-muted cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{firm.legalName}</p>
                      {firm.tradeName && (
                        <p className="text-xs text-muted-foreground">{firm.tradeName}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {firm.rnsp}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground capitalize">
                      {firm.planId}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${config.border} ${config.text}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {format(firm.createdAt, 'dd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
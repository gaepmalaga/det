import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getFirmComplianceAlerts, type ComplianceAlert } from '@/services/compliance'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const STATUS_CONFIG = {
  red: {
    label: 'Acción requerida',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  amber: {
    label: 'Revisión recomendada',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  green: {
    label: 'Correcto',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
}

export function CompliancePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.firmId) return
    setLoading(true)
    getFirmComplianceAlerts(user.firmId)
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user?.firmId])

  if (loading) return <LoadingSpinner />

  const red = alerts.filter((a) => a.status === 'red')
  const amber = alerts.filter((a) => a.status === 'amber')
  const total = alerts.length

  return (
    <div>
      <PageHeader
        title="Cumplimiento"
        description="Estado de cumplimiento normativo de los expedientes activos."
      />

      {/* Métricas — 1 col móvil, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div
          className={`rounded-xl p-4 border ${
            red.length > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert
              className={`w-4 h-4 ${
                red.length > 0 ? 'text-red-500' : 'text-slate-400'
              }`}
            />
            <p
              className={`text-xs font-medium uppercase tracking-wide ${
                red.length > 0 ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              Acción requerida
            </p>
          </div>
          <p
            className={`text-3xl font-semibold ${
              red.length > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {red.length}
          </p>
        </div>

        <div
          className={`rounded-xl p-4 border ${
            amber.length > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck
              className={`w-4 h-4 ${
                amber.length > 0 ? 'text-amber-500' : 'text-slate-400'
              }`}
            />
            <p
              className={`text-xs font-medium uppercase tracking-wide ${
                amber.length > 0 ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              En revisión
            </p>
          </div>
          <p
            className={`text-3xl font-semibold ${
              amber.length > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {amber.length}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total con alertas
            </p>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{total}</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Todo en orden
          </h3>
          <p className="text-sm text-slate-500">
            No hay alertas de cumplimiento en los expedientes activos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = STATUS_CONFIG[alert.status]
            return (
              <div
                key={alert.caseId}
                onClick={() => navigate('/app/cases/' + alert.caseId)}
                className={`rounded-xl border p-4 cursor-pointer transition-colors hover:opacity-90 active:opacity-80 ${config.bg} ${config.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${config.dot}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">
                          {alert.caseNumber}
                        </span>
                        <span className={`text-xs font-medium ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {alert.investigationType}
                      </p>
                      {alert.issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {alert.issues.map((issue, i) => (
                            <li
                              key={i}
                              className={`text-xs ${config.text}`}
                            >
                              · {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
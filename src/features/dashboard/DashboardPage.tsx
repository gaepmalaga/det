import { useAuth } from '@/contexts/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bienvenido, {user?.displayName ?? 'detective'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Expedientes activos', value: '—' },
          { label: 'Pre-expedientes pendientes', value: '—' },
          { label: 'Alertas de cumplimiento', value: '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-200 rounded-xl p-6"
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
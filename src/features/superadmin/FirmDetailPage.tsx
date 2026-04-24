import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Shield,
  Users,
  FolderOpen,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import {
  getFirmById,
  getFirmMembers,
  getFirmCaseCount,
  getFirmMemberCount,
  updateFirmStatus,
  updateFirmPlan,
  type SuperadminFirm,
  type FirmStatus,
} from '@/services/superadmin'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ROLE_LABELS } from '@/constants/roles'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { FirmMemberRole } from '@/types'

const STATUS_CONFIG = {
  trial: { label: 'Trial', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  active: { label: 'Activo', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  suspended: { label: 'Suspendido', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  cancelled: { label: 'Cancelado', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500' },
}

const PLANS = ['trial', 'starter', 'professional', 'enterprise']

export function FirmDetailPage() {
  const { firmId } = useParams<{ firmId: string }>()
  const navigate = useNavigate()

  const [firm, setFirm] = useState<SuperadminFirm | null>(null)
  const [members, setMembers] = useState<{
    id: string
    displayName: string
    email: string
    role: string
    tipNumber?: string
    isActive: boolean
  }[]>([])
  const [caseCount, setCaseCount] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showStatusConfirm, setShowStatusConfirm] = useState<FirmStatus | null>(null)

  const load = async () => {
    if (!firmId) return
    setLoading(true)
    try {
      const [firmData, membersData, cases, mCount] = await Promise.all([
        getFirmById(firmId),
        getFirmMembers(firmId),
        getFirmCaseCount(firmId),
        getFirmMemberCount(firmId),
      ])
      setFirm(firmData)
      setMembers(membersData)
      setCaseCount(cases)
      setMemberCount(mCount)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [firmId])

  const handleStatusChange = async (status: FirmStatus) => {
    if (!firmId) return
    setUpdating(true)
    try {
      await updateFirmStatus(firmId, status)
      setFirm((prev) => prev ? { ...prev, status } : null)
      setShowStatusConfirm(null)
    } finally {
      setUpdating(false)
    }
  }

  const handlePlanChange = async (planId: string) => {
    if (!firmId) return
    setUpdating(true)
    try {
      await updateFirmPlan(firmId, planId)
      setFirm((prev) => prev ? { ...prev, planId } : null)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!firm) return <p className="text-sm text-red-600">Despacho no encontrado.</p>

  const config = STATUS_CONFIG[firm.status] ?? STATUS_CONFIG.trial

  return (
    <div>
      <button
        onClick={() => navigate('/superadmin/firms')}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a despachos
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900">
                {firm.legalName}
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${config.border} ${config.text}`}>
                {config.label}
              </span>
            </div>
            {firm.tradeName && (
              <p className="text-sm text-slate-500">{firm.tradeName}</p>
            )}
            <p className="text-xs text-slate-400 font-mono mt-1">
              RNSP: {firm.rnsp}
            </p>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Miembros
            </p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{memberCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Expedientes
            </p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{caseCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Alta
            </p>
          </div>
          <p className="text-sm font-medium text-slate-700">
            {format(firm.createdAt, 'dd MMM yyyy', { locale: es })}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Plan
            </p>
          </div>
          <p className="text-sm font-medium text-slate-700 capitalize">
            {firm.planId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* Equipo */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Equipo
              </h2>
            </div>
            {members.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">Sin miembros.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Nombre
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Rol
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      TIP
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">
                          {member.displayName}
                        </p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {ROLE_LABELS[member.role as FirmMemberRole] ?? member.role}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">
                        {member.tipNumber ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          member.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {member.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">

          {/* Datos del despacho */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Datos legales
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">
                  {firm.legalType === 'individual' ? 'DNI / NIE' : 'CIF'}
                </p>
                <p className="text-sm text-slate-700 uppercase font-mono">
                  {firm.taxId}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">RNSP</p>
                <p className="text-sm text-slate-700 font-mono">{firm.rnsp}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">TIP titular</p>
                <p className="text-sm text-slate-700 font-mono">
                  {firm.titular.tipNumber || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tipo</p>
                <p className="text-sm text-slate-700">
                  {firm.legalType === 'individual' ? 'Persona física' : 'Sociedad'}
                </p>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Sede principal
            </h2>
            <div className="space-y-1 text-sm text-slate-700">
              <p>{firm.registeredAddress.street}</p>
              <p>
                {firm.registeredAddress.postalCode} {firm.registeredAddress.city}
              </p>
              <p>{firm.registeredAddress.province}</p>
            </div>
          </div>

          {/* Gestión del plan */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Plan
            </h2>
            <select
              value={firm.planId}
              onChange={(e) => handlePlanChange(e.target.value)}
              disabled={updating}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white disabled:opacity-50 capitalize"
            >
              {PLANS.map((plan) => (
                <option key={plan} value={plan} className="capitalize">
                  {plan}
                </option>
              ))}
            </select>
          </div>

          {/* Gestión del estado */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Estado del despacho
            </h2>

            {showStatusConfirm ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    ¿Confirmas cambiar el estado a{' '}
                    <strong>{STATUS_CONFIG[showStatusConfirm]?.label}</strong>?
                    Esta acción afecta al acceso del despacho.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStatusConfirm(null)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleStatusChange(showStatusConfirm)}
                    disabled={updating}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Procesando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {firm.status !== 'active' && (
                  <button
                    onClick={() => setShowStatusConfirm('active')}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Activar despacho
                  </button>
                )}
                {firm.status !== 'trial' && (
                  <button
                    onClick={() => setShowStatusConfirm('trial')}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Pasar a trial
                  </button>
                )}
                {firm.status !== 'suspended' && (
                  <button
                    onClick={() => setShowStatusConfirm('suspended')}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Suspender despacho
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
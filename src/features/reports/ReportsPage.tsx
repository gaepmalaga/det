import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ReportStatus } from '@/services/reports'

interface ReportListItem {
  id: string
  caseId: string
  caseNumber: string
  clientName: string
  status: ReportStatus
  registryNumber: string
  createdAt: Date
  approvedAt?: Date
  deliveredAt?: Date
  deliveredTo?: string
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  entregado: 'Entregado',
  archivado: 'Archivado',
}

const STATUS_COLORS: Record<ReportStatus, string> = {
  borrador: 'bg-slate-50 text-slate-700 border-slate-200',
  en_revision: 'bg-amber-50 text-amber-700 border-amber-200',
  aprobado: 'bg-blue-50 text-blue-700 border-blue-200',
  entregado: 'bg-green-50 text-green-700 border-green-200',
  archivado: 'bg-slate-50 text-slate-500 border-slate-200',
}

const STATUS_TABS: { label: string; value: ReportStatus | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Borrador', value: 'borrador' },
  { label: 'Aprobados', value: 'aprobado' },
  { label: 'Entregados', value: 'entregado' },
]

function toDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date()
}

function toDateOrUndefined(val: unknown): Date | undefined {
  if (!val) return undefined
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return undefined
}

export function ReportsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ReportStatus | 'todos'>('todos')

  const load = useCallback(async () => {
    if (!user?.firmId) return
    setLoading(true)
    try {
      // Obtener todos los expedientes del despacho
      const casesRef = collection(db, 'firms', user.firmId, 'cases')
      const casesSnap = await getDocs(casesRef)

      const allReports: ReportListItem[] = []

      // Por cada expediente buscar su informe
      await Promise.all(
        casesSnap.docs.map(async (caseDoc) => {
          const reportsRef = collection(
            db,
            'firms',
            user.firmId!,
            'cases',
            caseDoc.id,
            'reports'
          )
          const q = query(reportsRef, orderBy('createdAt', 'desc'))
          const reportsSnap = await getDocs(q)

          reportsSnap.docs.forEach((reportDoc) => {
            const data = reportDoc.data()
            allReports.push({
              id: reportDoc.id,
              caseId: caseDoc.id,
              caseNumber: data.caseNumber as string,
              clientName: data.clientName as string,
              status: data.status as ReportStatus,
              registryNumber: data.registryNumber as string,
              createdAt: toDate(data.createdAt),
              approvedAt: toDateOrUndefined(data.approvedAt),
              deliveredAt: toDateOrUndefined(data.deliveredAt),
              deliveredTo: data.deliveredTo as string | undefined,
            })
          })
        })
      )

      // Ordenar por fecha de creación descendente
      allReports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setReports(allReports)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = reports.filter((r) => {
    const matchTab = activeTab === 'todos' || r.status === activeTab
    const matchSearch =
      !search ||
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.registryNumber.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const counts = reports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Informes"
        description="Todos los informes de investigación del despacho."
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.value
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.value !== 'todos' && counts[tab.value] ? (
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                {counts[tab.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por cliente, expediente o número de registro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin informes"
          description="Los informes se crean desde el detalle de cada expediente."
        />
      ) : (
        <>
          {/* Cards en móvil */}
          <div className="space-y-2 md:hidden">
            {filtered.map((report) => (
              <div
                key={report.id}
                onClick={() => navigate('/app/cases/' + report.caseId + '?tab=informe')}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 transition-colors active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {report.clientName}
                    </p>
                    <span className="font-mono text-xs text-slate-400">
                      {report.caseNumber}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${STATUS_COLORS[report.status]}`}>
                    {STATUS_LABELS[report.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {format(report.createdAt, 'dd MMM yyyy', { locale: es })}
                  </p>
                  {report.deliveredAt && (
                    <p className="text-xs text-green-600">
                      Entregado el {format(report.deliveredAt, 'dd MMM yyyy', { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tabla en desktop */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Expediente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Creado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Entregado a
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => navigate('/app/cases/' + report.caseId + '?tab=informe')}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {report.caseNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{report.clientName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                      {format(report.createdAt, 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                      {report.deliveredTo ? (
                        <span className="text-green-700">{report.deliveredTo}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FileText,
  FileSignature,
  Receipt,
  Footprints,
  User,
  Archive,
  Download,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getDossier, dossierGaps, type Dossier } from '@/services/dossier'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{value?.trim() || '—'}</p>
    </div>
  )
}

// Cada bloque de la carpeta: presupuesto, contrato, informe, actuaciones.
// El encabezado dice siempre si la pieza está o no está, porque en una
// inspección la ausencia importa tanto como el contenido.
function Piece({
  icon: Icon,
  title,
  present,
  meta,
  to,
  children,
}: {
  icon: React.ElementType
  title: string
  present: boolean
  meta?: string
  to?: string
  children?: React.ReactNode
}) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Icon
          className={`w-4 h-4 shrink-0 ${present ? 'text-foreground' : 'text-muted-foreground'}`}
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {meta && <p className="text-xs text-muted-foreground truncate">{meta}</p>}
        </div>
        {to && (
          <Link
            to={to}
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            Abrir
          </Link>
        )}
      </header>
      <div className="p-4">
        {present ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">No consta en este asiento.</p>
        )}
      </div>
    </section>
  )
}

export function RegistryEntryPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    if (!user?.firmId || !entryId) return
    setLoading(true)
    try {
      setDossier(await getDossier(user.firmId, entryId))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.firmId, entryId])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = async () => {
    if (!dossier) return
    setExporting(true)
    try {
      // Carga diferida: el generador arrastra jsPDF y no tiene sentido que
      // pese en el arranque de la aplicación.
      const { exportDossierPdf } = await import('@/services/dossierExport')
      await exportDossierPdf(dossier)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  if (!dossier) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => navigate('/app/registry-book')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Libro-registro
        </button>
        <p className="text-sm text-muted-foreground">Este asiento no existe.</p>
      </div>
    )
  }

  const { entry, caseData, client, quote, contracts, report, actions } = dossier
  const gaps = dossierGaps(dossier)
  const critical = gaps.filter((g) => g.severity === 'critical')
  const signedContract = contracts.find((c) => c.status === 'firmado')

  return (
    <div className="pb-8">
      <Link
        to="/app/registry-book"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Libro-registro
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground tabular-nums">
              Asiento nº {entry.entryNumber}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                entry.status === 'abierto'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {entry.status === 'abierto' ? 'Abierto' : 'Cerrado'}
            </span>
            {entry.origin === 'historico' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-800 border-amber-200">
                <Archive className="w-3 h-3" />
                Histórico en papel
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Anotado el {format(entry.entryDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
            {entry.caseNumber && ` · Expediente ${entry.caseNumber}`}
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Generando...' : 'Descargar el asunto completo'}
        </button>
      </div>

      {/* Lo primero que se ve: si esta carpeta aguanta una inspección. */}
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${
          critical.length > 0
            ? 'bg-red-50 border-red-200'
            : gaps.length > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'
        }`}
      >
        {critical.length > 0 ? (
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        ) : gaps.length > 0 ? (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${
              critical.length > 0
                ? 'text-red-800'
                : gaps.length > 0
                  ? 'text-amber-900'
                  : 'text-green-800'
            }`}
          >
            {gaps.length === 0
              ? 'El asunto está completo.'
              : critical.length > 0
                ? `Faltan ${critical.length} ${critical.length === 1 ? 'documento o dato exigible' : 'documentos o datos exigibles'}.`
                : 'El asunto está en curso, con avisos.'}
          </p>
          {gaps.length === 0 ? (
            <p className="text-xs text-green-800/80 mt-0.5">
              Contrato firmado, informe y datos del Anexo VII, todo anotado.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {gaps.map((gap) => (
                <li
                  key={gap.label}
                  className={`text-xs ${gap.severity === 'critical' ? 'text-red-800' : 'text-amber-900'}`}
                >
                  <span className="font-medium">{gap.label}.</span> {gap.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* El asiento tal y como está escrito en el libro. */}
        <section className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <header className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              El asiento en el libro
            </h2>
            <p className="text-xs text-muted-foreground">
              Columnas del Anexo VII de la Orden INT/318/2011.
            </p>
          </header>
          <div className="p-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nº de registro del despacho" value={entry.firmRnsp} />
            <Field
              label="Fecha de inicio"
              value={format(entry.startDate, 'dd/MM/yyyy', { locale: es })}
            />
            <Field label="Contratante" value={entry.clientName} />
            <Field label="NIF / CIF del contratante" value={entry.clientTaxId} />
            <div className="sm:col-span-2">
              <Field label="Domicilio del contratante" value={entry.clientAddress} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Objeto de la investigación" value={entry.investigationObject} />
            </div>
            <Field label="Investigado" value={entry.investigatedName} />
            <Field label="Domicilio del investigado" value={entry.investigatedAddress} />
            <Field label="Detective actuante" value={entry.detectiveName} />
            <Field label="TIP" value={entry.detectiveTip} />
            <Field
              label="Fecha de finalización"
              value={entry.endDate ? format(entry.endDate, 'dd/MM/yyyy', { locale: es }) : ''}
            />
            {entry.physicalLocation && (
              <Field label="Carpeta física" value={entry.physicalLocation} />
            )}
            {entry.knownOffenses && (
              <div className="sm:col-span-2 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-900">
                    Delitos perseguibles de oficio conocidos
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">{entry.knownOffenses}</p>
                  {entry.offensesReportedTo && (
                    <p className="text-xs text-amber-800 mt-0.5">
                      Comunicado a: {entry.offensesReportedTo}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {entry.amendments.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/40">
              <p className="text-xs font-medium text-foreground mb-1.5">
                Rectificaciones ({entry.amendments.length})
              </p>
              <ul className="space-y-1">
                {entry.amendments.map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    {format(a.amendedAt, 'dd/MM/yyyy', { locale: es })} · {a.field}:{' '}
                    <span className="line-through">{a.oldValue || '—'}</span> →{' '}
                    {a.newValue || '—'} ({a.reason})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Quién contrató. */}
        <Piece
          icon={User}
          title="Cliente"
          present={!!client}
          meta={client?.taxId}
          to={client ? `/app/clients/${client.id}` : undefined}
        >
          {client && (
            <div className="space-y-3">
              <Field label="Razón social / nombre" value={client.legalName} />
              <Field label="Email" value={client.email} />
              <Field label="Teléfono" value={client.phone} />
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                Desde su ficha se ven todos los asuntos, presupuestos y contratos de
                este cliente.
              </p>
            </div>
          )}
        </Piece>

        <Piece
          icon={Receipt}
          title="Presupuesto"
          present={!!quote}
          meta={quote?.quoteNumber}
          to="/app/quotes"
        >
          {quote && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Estado" value={quote.status} />
              <Field
                label="Importe"
                value={quote.amount != null ? `${quote.amount} €` : ''}
              />
              <div className="sm:col-span-2">
                <Field label="Descripción" value={quote.description} />
              </div>
            </div>
          )}
        </Piece>

        <Piece
          icon={FileSignature}
          title="Contrato"
          present={contracts.length > 0}
          meta={
            signedContract
              ? `${signedContract.contractNumber} · firmado`
              : contracts[0]?.contractNumber
          }
          to="/app/contracts"
        >
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.contractNumber}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      c.status === 'firmado'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                {c.signedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Firmado el {format(c.signedAt, 'dd/MM/yyyy', { locale: es })}
                    {c.signedByName && ` por ${c.signedByName}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Piece>

        <Piece
          icon={FileText}
          title="Informe"
          present={!!report}
          meta={report?.status}
          to={caseData ? `/app/cases/${caseData.id}` : undefined}
        >
          {report && (
            <div className="space-y-3">
              <Field label="Objeto del servicio" value={report.serviceObject} />
              <Field label="Medios empleados" value={report.methodsUsed} />
              {report.deliveredAt && (
                <Field
                  label="Entregado"
                  value={`${format(report.deliveredAt, 'dd/MM/yyyy', { locale: es })}${
                    report.deliveredTo ? ` a ${report.deliveredTo}` : ''
                  }`}
                />
              )}
            </div>
          )}
        </Piece>

        <Piece
          icon={Footprints}
          title="Actuaciones"
          present={actions.length > 0}
          meta={`${actions.length} ${actions.length === 1 ? 'anotación' : 'anotaciones'}`}
          to={caseData ? `/app/cases/${caseData.id}` : undefined}
        >
          <ul className="space-y-2">
            {actions.slice(0, 6).map((a) => (
              <li key={a.id} className="text-sm">
                <p className="text-xs text-muted-foreground">
                  {format(a.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                  {a.detectiveTip && ` · TIP ${a.detectiveTip}`}
                </p>
                <p className="text-foreground line-clamp-2">{a.description}</p>
              </li>
            ))}
            {actions.length > 6 && (
              <li className="text-xs text-muted-foreground">
                y {actions.length - 6} más en el expediente.
              </li>
            )}
          </ul>
        </Piece>
      </div>
    </div>
  )
}

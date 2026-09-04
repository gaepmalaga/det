import { CheckCircle, Send, Loader2, Download, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Report } from '@/services/reports'
import type { Firm } from '@/types'
import { REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, faltanEnInforme } from './utils'

interface ReportViewProps {
  report: Report
  firm: Firm | null
  isClosed: boolean
  submitting: boolean
  approveError: string | null
  exportingPdf: boolean
  exportingDocx: boolean
  showDeliverForm: boolean
  deliveredTo: string
  onExportPdf: () => void
  onExportDocx: () => void
  onStartEditing: () => void
  onApprove: () => void
  onShowDeliverForm: () => void
  onHideDeliverForm: () => void
  onDeliveredToChange: (value: string) => void
  onDeliver: () => void
}

export function ReportView({
  report,
  firm,
  isClosed,
  submitting,
  approveError,
  exportingPdf,
  exportingDocx,
  showDeliverForm,
  deliveredTo,
  onExportPdf,
  onExportDocx,
  onStartEditing,
  onApprove,
  onShowDeliverForm,
  onHideDeliverForm,
  onDeliveredToChange,
  onDeliver,
}: ReportViewProps) {
  const faltan = faltanEnInforme(report)

  return (
    <div className="space-y-6">
      {/* Header del informe */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">{report.registryNumber}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${REPORT_STATUS_COLORS[report.status]}`}>
              {REPORT_STATUS_LABELS[report.status]}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Informe de investigación</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Creado el {format(report.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExportPdf}
            disabled={!firm || exportingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            Exportar PDF
          </button>
          <button
            onClick={onExportDocx}
            disabled={!firm || exportingDocx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            {exportingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar Word
          </button>
          {report.status === 'borrador' && !isClosed && (
            <>
              <button
                onClick={onStartEditing}
                className="px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Editar
              </button>
              <button
                onClick={onApprove}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3 h-3" />
                Aprobar
              </button>
            </>
          )}
          {report.status === 'aprobado' && !isClosed && (
            <button
              onClick={onShowDeliverForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Send className="w-3 h-3" />
              Entregar al cliente
            </button>
          )}
        </div>

        {report.status === 'borrador' && !isClosed && faltan.length > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Borrador a medias: falta {faltan.join(', ')}. Puedes
            dejarlo así y seguir otro día; para aprobarlo tendrá que estar
            completo.
          </p>
        )}

        {approveError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
            {approveError}
          </p>
        )}
      </div>

      {/* Formulario de entrega */}
      {showDeliverForm && (
        <div className="bg-card border border-green-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Confirmar entrega del informe
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Al confirmar la entrega el expediente se cerrará automáticamente
            y quedará bloqueado para edición.
          </p>
          <div className="mb-3">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Entregado a <span className="text-red-500">*</span>
            </label>
            <input
              value={deliveredTo}
              onChange={(e) => onDeliveredToChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Nombre del receptor del informe"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onHideDeliverForm}
              className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onDeliver}
              disabled={submitting || !deliveredTo.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Procesando...' : 'Confirmar entrega y cerrar expediente'}
            </button>
          </div>
        </div>
      )}

      {/* Contenido del informe */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm">
        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Datos del contratante
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Nombre</p>
              <p className="text-sm text-foreground font-medium">{report.clientName}</p>
            </div>
            {report.clientTaxId && (
              <div>
                <p className="text-xs text-muted-foreground">NIF / NIE</p>
                <p className="text-sm text-foreground uppercase">{report.clientTaxId}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Detectives intervinientes
          </p>
          <div className="space-y-2">
            {report.detectives.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium shrink-0">
                  {d.detectiveName[0]}
                </div>
                <div>
                  <p className="text-sm text-foreground">{d.detectiveName}</p>
                  {d.detectiveTip && (
                    <p className="text-xs text-muted-foreground font-mono">TIP: {d.detectiveTip}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Objeto de la contratación
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{report.serviceObject}</p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Medios utilizados
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{report.methodsUsed}</p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Actuaciones realizadas
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{report.actionsPerformed}</p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Resultados obtenidos
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{report.results}</p>
        </div>

        {report.conclusions && (
          <div className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Conclusiones
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{report.conclusions}</p>
          </div>
        )}

        {report.observations && (
          <div className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Observaciones
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{report.observations}</p>
          </div>
        )}

        {report.deliveredAt && (
          <div className="p-5 bg-green-50">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
              Entrega registrada
            </p>
            <p className="text-sm text-green-900">
              Entregado a <strong>{report.deliveredTo}</strong> el{' '}
              {format(report.deliveredAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

import { FileText, Plus, Sparkles, Loader2 } from 'lucide-react'

interface ReportEmptyStateProps {
  canCreateReport: boolean
  isClosed: boolean
  hasActions: boolean
  generatingDraft: boolean
  draftError: string | null
  onRedactar: () => void
  onGenerateDraft: () => void
}

export function ReportEmptyState({
  canCreateReport,
  isClosed,
  hasActions,
  generatingDraft,
  draftError,
  onRedactar,
  onGenerateDraft,
}: ReportEmptyStateProps) {
  return (
    <div className="space-y-6">
      {!canCreateReport && !isClosed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            El informe solo puede redactarse cuando el expediente está activo.
            Firma el contrato para activar el expediente.
          </p>
        </div>
      )}

      {isClosed && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Expediente cerrado sin informe registrado.</p>
        </div>
      )}

      {canCreateReport && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Sin informe</p>
          <p className="text-xs text-muted-foreground mb-4">
            Redacta el informe de investigación. Al entregarlo el expediente se cerrará automáticamente.
          </p>
          {draftError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 max-w-sm">
              {draftError}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={onRedactar}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Redactar informe
            </button>
            {hasActions && (
              <button
                onClick={onGenerateDraft}
                disabled={generatingDraft}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                {generatingDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generatingDraft ? 'Generando borrador...' : 'Generar borrador con IA'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

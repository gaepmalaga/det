import { AlertTriangle, Sparkles } from 'lucide-react'
import type { CaseAction } from '@/types'
import { compileActionsText, type ReportFormState } from './utils'

interface ReportFormProps {
  editing: boolean
  form: ReportFormState
  caseActions: CaseAction[]
  submitting: boolean
  draftGenerated: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onCompileActions: (text: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function ReportForm({
  editing,
  form,
  caseActions,
  submitting,
  draftGenerated,
  onChange,
  onCompileActions,
  onSubmit,
  onCancel,
}: ReportFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {editing ? 'Editar el borrador' : 'Nuevo informe de investigación'}
        </h3>
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Campos obligatorios por ley (art. 49.1 Ley 5/2014): número de registro,
          datos del contratante, objeto, medios, resultados, detectives intervinientes
          y actuaciones realizadas.
        </p>
      </div>

      {draftGenerated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Borrador generado con IA a partir de las actuaciones registradas. Revísalo y
            corrígelo antes de guardar — la responsabilidad del contenido del informe es tuya.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Nombre del contratante <span className="text-red-500">*</span>
            </label>
            <input
              name="clientName"
              value={form.clientName}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Nombre completo del cliente"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              NIF / NIE del contratante
            </label>
            <input
              name="clientTaxId"
              value={form.clientTaxId}
              onChange={onChange}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
              placeholder="12345678A"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Objeto de la contratación <span className="text-red-500">*</span>
          </label>
          <textarea
            name="serviceObject"
            value={form.serviceObject}
            onChange={onChange}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
            placeholder="Describe el objeto de la investigación contratada..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Medios utilizados <span className="text-red-500">*</span>
          </label>
          <textarea
            name="methodsUsed"
            value={form.methodsUsed}
            onChange={onChange}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
            placeholder="Describe los medios técnicos y humanos empleados..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-foreground">
              Actuaciones realizadas <span className="text-red-500">*</span>
            </label>
            {caseActions.length > 0 && (
              <button
                type="button"
                onClick={() => onCompileActions(compileActionsText(caseActions))}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Compilar {caseActions.length} actuaciones
              </button>
            )}
          </div>
          <textarea
            name="actionsPerformed"
            value={form.actionsPerformed}
            onChange={onChange}
            rows={6}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
            placeholder="Describe cronológicamente las actuaciones realizadas durante la investigación..."
          />
          {caseActions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              "Compilar" ordena cronológicamente las actuaciones registradas en la pestaña
              Actuaciones. Revisa y redacta el texto en lenguaje de informe antes de guardar.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Resultados obtenidos <span className="text-red-500">*</span>
          </label>
          <textarea
            name="results"
            value={form.results}
            onChange={onChange}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
            placeholder="Describe los resultados y hallazgos de la investigación..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Conclusiones{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            name="conclusions"
            value={form.conclusions}
            onChange={onChange}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
            placeholder="Conclusiones del detective..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Observaciones{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            name="observations"
            value={form.observations}
            onChange={onChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none focus:border-primary"
            placeholder="Observaciones adicionales..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    </div>
  )
}

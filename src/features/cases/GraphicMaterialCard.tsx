import { useState } from 'react'
import { Video, Scale, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { setGraphicMaterial, retentionStatus, RETENTION_LABELS } from '@/services/retention'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Case } from '@/types'

interface Props {
  caseData: Case
  onSaved: () => void
}

// Sin esto, la obligación de destruir del art. 49.4 no se puede cumplir:
// la plataforma no sabría que hay material grabado ni dónde está. No se
// guardan aquí las grabaciones —viven en el disco o la tarjeta del
// detective—, solo la constancia de que existen y de su destrucción.
export function GraphicMaterialCard({ caseData, onSaved }: Props) {
  const { user } = useAuth()
  const [has, setHas] = useState(caseData.hasGraphicMaterial ?? false)
  const [location, setLocation] = useState(caseData.graphicMaterialLocation ?? '')
  const [held, setHeld] = useState(caseData.hasActiveException)
  const [reason, setReason] = useState(caseData.exceptionReason ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const status = retentionStatus(caseData)
  const destroyed = !!caseData.graphicMaterialDestroyedAt

  const handleSave = async () => {
    if (!user?.firmId) return
    setSaving(true)
    try {
      await setGraphicMaterial(user.firmId, caseData.id, {
        hasGraphicMaterial: has,
        graphicMaterialLocation: location.trim(),
        hasActiveException: held,
        exceptionReason: reason.trim(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Video className="w-4 h-4 text-muted-foreground" />
        Material grabado
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Las imágenes y sonidos grabados se destruyen tres años después de
        terminar la investigación, salvo procedimiento judicial, policial o
        sancionador (art. 49.4 de la Ley 5/2014).
      </p>

      {destroyed ? (
        <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg">
          <Check className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Material destruido el{' '}
            {format(caseData.graphicMaterialDestroyedAt!, "d 'de' MMMM 'de' yyyy", {
              locale: es,
            })}
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={has}
              onChange={(e) => setHas(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm text-foreground">
                En esta investigación se han grabado imágenes o sonidos
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Fotos, vídeo o audio de seguimientos, no las notas ni el informe.
              </span>
            </span>
          </label>

          {has && (
            <>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Dónde está guardado
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Disco externo del despacho, carpeta 2026/EXP-0007..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dentro de tres años habrá que ir a buscarlo para destruirlo.
                </p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={held}
                  onChange={(e) => setHeld(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="block text-sm text-foreground">
                  Está relacionado con un procedimiento judicial, policial o
                  sancionador
                </span>
              </label>

              {held && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Qué procedimiento
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Juzgado de lo Social nº 3 de Málaga, autos 412/2026"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mientras dure, el material no se destruye — y hay que poder
                    justificar por qué se conserva.
                  </p>
                </div>
              )}

              {status.dueDate && (
                <div className="p-3 bg-muted border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    {RETENTION_LABELS[status.state]}
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    Destrucción el{' '}
                    {format(status.dueDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              )}

              {!caseData.closedAt && (
                <p className="text-xs text-muted-foreground">
                  El plazo empieza a contar cuando termine la investigación, así
                  que todavía no hay fecha de destrucción.
                </p>
              )}
            </>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            {saved && <span className="text-xs text-green-700">Guardado.</span>}
            {held && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                <Scale className="w-3.5 h-3.5" />
                retenido
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

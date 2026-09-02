import { useState } from 'react'
import { Database, AlertTriangle, Check, ListOrdered } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFirm } from '@/hooks/useFirm'
import { seedDemoData, type SeedResult } from '@/services/demoSeed'
import { renumberRegistryChronologically } from '@/services/registry'

// Enseñar la plataforma con dos asuntos dentro no convence a nadie: un
// despacho quiere verla con volumen, con archivo detrás y con asuntos a
// medias. Esto es para las cuentas de demostración, y por eso avisa de lo
// que va a hacer: escribe asientos en el libro-registro, que en una cuenta
// real es un documento con valor legal.
export function DemoDataTab() {
  const { user } = useAuth()
  const { firm, reload } = useFirm()
  const [confirmed, setConfirmed] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [result, setResult] = useState<SeedResult | null>(null)
  const [renumbered, setRenumbered] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSeed = async () => {
    if (!firm || !user) return
    setWorking('sembrando')
    setError(null)
    try {
      const r = await seedDemoData(firm, user.uid, user.displayName ?? '')
      setResult(r)
      await reload()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudieron crear los datos.')
    } finally {
      setWorking(null)
    }
  }

  const handleRenumber = async () => {
    if (!firm) return
    setWorking('renumerando')
    setError(null)
    try {
      const r = await renumberRegistryChronologically(firm.id)
      setRenumbered(
        r.renumbered === 0
          ? 'El libro ya estaba en orden: no se ha cambiado ningún número.'
          : `Renumerados ${r.renumbered} asientos. El siguiente será el nº ${r.nextNumber}.`
      )
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo renumerar.')
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          Rellenar con datos de demostración
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Añade ocho asuntos repartidos por el año —laboral, seguros,
          arrendaticio, familia y competencia desleal— con su cliente,
          presupuesto aceptado, contrato firmado, actuaciones del día a día,
          informe entregado y su asiento en el libro. Y cinco consultas
          abiertas que todavía no han contratado.
        </p>

        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">
            Esto <strong>escribe asientos en el libro-registro</strong>, que en
            una cuenta real es un documento con valor legal y del que no se
            pueden borrar asientos. Úsalo solo en cuentas de demostración.
          </p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground">
            Entiendo que este despacho es una cuenta de demostración
          </span>
        </label>

        <button
          onClick={handleSeed}
          disabled={!confirmed || working !== null}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {working === 'sembrando' ? 'Creando...' : 'Crear los datos'}
        </button>

        {result && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mt-4">
            <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-xs text-green-800">
              Creados {result.asuntos} asuntos con sus contratos e informes,{' '}
              {result.actuaciones} actuaciones, {result.informes} informes
              entregados y {result.consultas} consultas abiertas.
            </p>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-muted-foreground" />
          Reordenar la numeración por fecha
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          El libro se numera por orden de encargo: el asiento 15 no puede haber
          empezado antes que el 14. Si al traerse el histórico de papel los
          números quedaron por encima de los que ya había, el libro cuenta la
          historia al revés — y eso es lo que mira una inspección. Esto los
          reordena de la fecha más antigua a la más reciente, empezando en 1.
          Solo funciona si todavía no se ha impreso ningún folio.
        </p>

        <button
          onClick={handleRenumber}
          disabled={working !== null}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          {working === 'renumerando' ? 'Renumerando...' : 'Reordenar'}
        </button>

        {renumbered && (
          <p className="text-xs text-green-700 mt-3">{renumbered}</p>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { peekSequenceNumber, setNextSequenceNumber } from '@/services/counters'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// El libro de papel manda: un despacho que llega con 200 asuntos anotados
// tiene que continuar en el 201, no volver a empezar. Y como alguien
// acabará escribiendo en el libro sin pasar por la plataforma, el número
// tiene que poder corregirse — hacia adelante, nunca hacia atrás, porque
// reutilizar un número rompe la correlatividad del libro.
export function RegistryBookTab() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [nextNumber, setNextNumber] = useState<number | null>(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.firmId) return
    setLoading(true)
    try {
      const next = await peekSequenceNumber(user.firmId, 'registry')
      setNextNumber(next)
      setValue(String(next))
    } catch (err) {
      console.error(err)
      setError('No se pudo leer la numeración del libro.')
    } finally {
      setLoading(false)
    }
  }, [user?.firmId])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.firmId) return
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError('Escribe un número de asiento válido.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await setNextSequenceNumber(user.firmId, 'registry', Math.floor(parsed))
      await load()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la numeración.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const changed = nextNumber !== null && Number(value) !== nextNumber

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          Numeración del libro-registro
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          Los asientos se numeran de forma correlativa y continua, sin reiniciar
          cada año. Si tu despacho ya lleva un libro en papel, indica aquí por
          qué número debe continuar la plataforma.
        </p>

        <div className="p-4 bg-muted border border-border rounded-lg mb-5">
          <p className="text-xs text-muted-foreground">El próximo asiento será el</p>
          <p className="text-2xl font-semibold text-foreground tabular-nums mt-0.5">
            nº {nextNumber}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Continuar la numeración en
          </label>
          <input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-40 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Solo puede avanzar. Retroceder repetiría un asiento que ya existe,
            y el libro dejaría de ser correlativo.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-xs text-green-700 mt-4">Numeración actualizada.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !changed}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Guardando...' : 'Guardar numeración'}
      </button>
    </form>
  )
}

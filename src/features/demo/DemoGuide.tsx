import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Compass, X, Check, ChevronDown } from 'lucide-react'
import { useFirm } from '@/hooks/useFirm'
import { DEMO_TOTALS } from '@/services/demoSeed'

// Un despacho que entra a probar no sabe por dónde empezar ni qué hay
// dentro, y si lo primero que ve son dos asuntos abiertos, se va pensando
// que la plataforma está vacía. Esta guía cuenta lo que hay y propone el
// recorrido — cuatro cosas concretas, en el orden en que tienen sentido.
//
// Solo aparece en los despachos de prueba: en uno real sería ruido.

interface Paso {
  id: string
  titulo: string
  detalle: string
  to: string
  /** Rutas que dan el paso por visto. */
  matches: (path: string) => boolean
}

const PASOS: Paso[] = [
  {
    id: 'libro',
    titulo: 'Abre el libro-registro',
    detalle:
      'Todos los asuntos del despacho, agrupados por año igual que tus carpetas. Pincha en cualquiera.',
    to: '/app/registry-book',
    matches: (p) => p.startsWith('/app/registry-book'),
  },
  {
    id: 'asiento',
    titulo: 'Entra en un asiento',
    detalle:
      'Ahí está todo el asunto: contratante, investigado, contrato, actuaciones e informe. Y lo que le falta, si le falta algo.',
    to: '/app/registry-book',
    matches: (p) => /^\/app\/registry-book\/.+/.test(p),
  },
  {
    id: 'actuacion',
    titulo: 'Anota una actuación',
    detalle:
      'Entra en un asunto abierto desde Hoy y añade una. Con su hora, su sitio en el mapa y tu TIP.',
    to: '/app/today',
    matches: (p) => /^\/app\/cases\/.+/.test(p),
  },
  {
    id: 'imprimir',
    titulo: 'Imprime un folio del libro',
    detalle:
      'En el libro-registro, botón «Imprimir». Sale en formato Anexo VII, a dos caras, listo para tus hojas selladas.',
    to: '/app/registry-book',
    matches: () => false,
  },
]

const STORAGE_KEY = 'detectiveos.demo.guia'

function readState(): { hidden: boolean; done: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { hidden: false, done: [] }
  } catch {
    return { hidden: false, done: [] }
  }
}

export function DemoGuide() {
  const { firm } = useFirm()
  const location = useLocation()
  const [state, setState] = useState(readState)
  const [open, setOpen] = useState(true)

  // Los pasos se marcan solos según se recorre la plataforma: pedirle a
  // alguien que vaya tachando una lista es pedirle trabajo. Se ajusta
  // durante el render al cambiar de ruta, no en un efecto, para no
  // encadenar dos renders por cada navegación.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    const alcanzado = PASOS.find(
      (p) => p.matches(location.pathname) && !state.done.includes(p.id)
    )
    if (alcanzado) {
      setState((prev) => ({ ...prev, done: [...prev.done, alcanzado.id] }))
    }
  }

  // El efecto solo escribe: no cambia estado ni provoca otro render.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* sin almacenamiento, la guía sigue funcionando */
    }
  }, [state])

  if (!firm?.isDemo || state.hidden) return null

  const ocultar = () => setState((prev) => ({ ...prev, hidden: true }))

  const hechos = state.done.length

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="max-w-lg mx-auto p-3 pointer-events-auto">
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Compass className="w-4 h-4 text-brand-gold shrink-0" />
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex-1 text-left min-w-0"
              aria-expanded={open}
            >
              <p className="text-sm font-medium text-foreground">
                Este es tu despacho de prueba
              </p>
              <p className="text-xs text-muted-foreground">
                {hechos === PASOS.length
                  ? 'Ya lo has visto todo. Sigue trasteando lo que quieras.'
                  : `Recorrido sugerido · ${hechos} de ${PASOS.length}`}
              </p>
            </button>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? '' : 'rotate-180'}`}
            />
            <button
              onClick={ocultar}
              className="p-1 -mr-1 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Ocultar la guía"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {open && (
            <>
              <p className="px-4 pb-3 text-xs text-muted-foreground border-b border-border">
                Tiene dentro{' '}
                <strong className="text-foreground">
                  {DEMO_TOTALS.asientos} asientos
                </strong>{' '}
                de libro con su contrato firmado,{' '}
                <strong className="text-foreground">
                  {DEMO_TOTALS.informes} informes
                </strong>{' '}
                entregados, {DEMO_TOTALS.actuaciones} actuaciones anotadas y{' '}
                {DEMO_TOTALS.consultas} consultas sin cerrar. Es tuyo: puedes
                cambiar y borrar lo que quieras sin afectar a nadie.
              </p>

              <ol className="divide-y divide-border max-h-[42vh] overflow-y-auto">
                {PASOS.map((paso, i) => {
                  const hecho = state.done.includes(paso.id)
                  return (
                    <li key={paso.id}>
                      <Link
                        to={paso.to}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors"
                      >
                        <span
                          className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-medium ${
                            hecho
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {hecho ? <Check className="w-3 h-3" /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-sm ${hecho ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}
                          >
                            {paso.titulo}
                          </span>
                          <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
                            {paso.detalle}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

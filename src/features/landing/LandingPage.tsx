import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Fingerprint,
  MapPin,
  BookOpen,
  ArrowRight,
  Briefcase,
  Handshake,
  UserRound,
  Loader2,
} from 'lucide-react'
import { startDemo, type DemoRole } from '@/services/demoSession'
import { ROUTES } from '@/constants/routes'

// Dos cosas, no diez. Un despacho no cambia de forma de trabajar porque le
// enseñes una lista de funciones: cambia porque le quitas de encima lo que
// más tiempo le come. Aquí solo se cuentan esas dos, y se entra a probarlo.
const PUERTAS: {
  role: DemoRole
  icon: React.ElementType
  title: string
  desc: string
}[] = [
  {
    role: 'despacho',
    icon: Briefcase,
    title: 'Soy un despacho',
    desc: 'El libro-registro, los asuntos y las actuaciones del día a día.',
  },
  {
    role: 'colaborador',
    icon: Handshake,
    title: 'Colaboro con despachos',
    desc: 'Cómo se reciben encargos y se reportan actuaciones a otro despacho.',
  },
  {
    role: 'cliente',
    icon: UserRound,
    title: 'Soy cliente de uno',
    desc: 'Lo que ve quien te contrata: estado del asunto e informe.',
  },
]

export function LandingPage() {
  const [loading, setLoading] = useState<DemoRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  const entrar = async (role: DemoRole) => {
    setLoading(role)
    setError(null)
    try {
      await startDemo(role)
      // Recarga completa a propósito, no navegación interna: Firebase avisa
      // del inicio de sesión antes de que exista el despacho, así que la
      // aplicación ya ha decidido que este usuario no tiene ninguno y
      // mandaría a configurarlo. Entrando en frío, resuelve con el despacho
      // ya creado y relleno.
      window.location.assign(ROUTES.TODAY)
    } catch (err) {
      console.error(err)
      setError(
        'No se ha podido abrir la demostración. Vuelve a intentarlo en un momento.'
      )
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Cabecera ── */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-gold text-brand-gold-foreground">
              <Fingerprint className="w-3.5 h-3.5" strokeWidth={2.25} />
            </div>
            <span className="font-semibold text-sm tracking-wide">DetectiveOS</span>
          </div>
          <Link
            to={ROUTES.LOGIN}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* ── Portada ── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground mb-6">
          Para despachos de detectives privados
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight max-w-[19ch]">
          Anota lo que ves.
          <br />
          <span className="text-muted-foreground">El resto se escribe solo.</span>
        </h1>
        <p className="mt-7 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Dos cosas se llevan las horas de un despacho: pasar a limpio las
          actuaciones para redactar el informe, y mantener el libro-registro al
          día en un formato que aguante una inspección. DetectiveOS hace las
          dos, y no te pide nada más.
        </p>
      </section>

      {/* ── Punto 1: actuaciones ── */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-brand-gold mb-4">
              <MapPin className="w-3.5 h-3.5" />
              Uno
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight mb-4">
              Escribes cuatro líneas en el coche. El informe ya está medio hecho.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Cada actuación se anota en el momento, desde el móvil, con su hora,
              su sitio en el mapa y el TIP de quien la hizo. No hay que acordarse
              después ni descifrar una libreta a las once de la noche.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Cuando toca redactar, el informe se levanta sobre lo que ya está
              anotado: fechas, medios empleados, actuaciones y resultados en el
              orden que exige el artículo 49 de la Ley 5/2014. Tú escribes las
              conclusiones. Lo demás ya estaba escrito.
            </p>
          </div>

          {/* Muestra de actuaciones */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Actuaciones · Asiento 124</span>
              <span className="text-xs text-muted-foreground">4 anotadas</span>
            </div>
            <ul className="divide-y divide-border">
              {[
                {
                  h: '23/03 · 07:04',
                  l: 'Calle Ayala 47, Málaga',
                  t: 'Vigilancia estática frente al domicilio. A las 08:12h sale con ropa de trabajo y accede a un vehículo comercial rotulado.',
                },
                {
                  h: '23/03 · 09:30',
                  l: 'Alhaurín de la Torre',
                  t: 'Se le sigue hasta una obra, donde descarga material y permanece trabajando hasta las 14:30h.',
                },
                {
                  h: '28/03 · 08:05',
                  l: 'Calle Ayala 47, Málaga',
                  t: 'Se repite el patrón. Maneja sacos de cemento sin limitación aparente de movilidad.',
                },
              ].map((a) => (
                <li key={a.h} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-mono tabular-nums">{a.h}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {a.l}
                    </span>
                  </div>
                  <p className="text-sm leading-snug">{a.t}</p>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 border-t border-border bg-muted/50 flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-brand-gold shrink-0" />
              <p className="text-xs text-muted-foreground">
                De aquí sale el apartado «actuaciones practicadas» del informe,
                sin volver a teclearlo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Punto 2: libro ── */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-brand-gold mb-4">
              <BookOpen className="w-3.5 h-3.5" />
              Dos
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight mb-4">
              El libro-registro sale impreso en el formato del Anexo VII.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Folio a folio, encajando en tu libro físico, para imprimir sobre
              las hojas numeradas y selladas. Cada asiento cae siempre en la
              misma fila del mismo folio, se imprima hoy o dentro de un año.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              La numeración es correlativa de verdad: no se repite aunque dos
              personas den de alta a la vez, no retrocede, y no deja que el libro
              vaya hacia atrás en el tiempo.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Y si ya llevas doscientos asuntos en papel, te los traes pegando el
              Excel que ya tienes. No empiezas de cero.
            </p>
          </div>

          {/* Facsímil del Anexo VII */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Libro-registro de detectives privados
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Orden INT/318/2011, Anexo VII · cara izquierda
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-brand-gold">
                Folio 14
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[11px] border-collapse">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-border bg-muted px-2 py-1.5 font-semibold align-middle w-16"
                    >
                      Número de orden
                    </th>
                    <th
                      colSpan={2}
                      className="border border-border bg-muted px-2 py-1.5 font-semibold"
                    >
                      Encargo de investigación
                    </th>
                    <th
                      colSpan={2}
                      className="border border-border bg-muted px-2 py-1.5 font-semibold"
                    >
                      Contratante
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-border bg-muted/70 px-2 py-1.5 font-medium">
                      Fecha de inicio
                    </th>
                    <th className="border border-border bg-muted/70 px-2 py-1.5 font-medium">
                      Asunto
                    </th>
                    <th className="border border-border bg-muted/70 px-2 py-1.5 font-medium">
                      Nombre o razón social
                    </th>
                    <th className="border border-border bg-muted/70 px-2 py-1.5 font-medium">
                      Domicilio/localidad
                    </th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border px-2 py-2 text-center font-mono tabular-nums text-foreground">
                      124
                    </td>
                    <td className="border border-border px-2 py-2">12/03/2026</td>
                    <td className="border border-border px-2 py-2">
                      Laboral — compatibilidad de baja médica
                    </td>
                    <td className="border border-border px-2 py-2">
                      Talleres Guadalhorce S.L.
                    </td>
                    <td className="border border-border px-2 py-2">
                      Pol. Ind. Villa Rosa 14, Málaga
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-2 text-center font-mono tabular-nums text-foreground">
                      125
                    </td>
                    <td className="border border-border px-2 py-2">02/04/2026</td>
                    <td className="border border-border px-2 py-2">
                      Arrendaticio — cesión inconsentida
                    </td>
                    <td className="border border-border px-2 py-2">
                      Bufete Alarcón &amp; Rivas
                    </td>
                    <td className="border border-border px-2 py-2">
                      Alameda Principal 22, Málaga
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-3 text-center font-mono tabular-nums text-foreground">
                      126
                    </td>
                    <td className="border border-border" />
                    <td className="border border-border" />
                    <td className="border border-border" />
                    <td className="border border-border" />
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-border bg-muted/50">
              <p className="font-mono text-[10px] text-muted-foreground">
                Libro habilitado por diligencia DIL-2026/0447 de 15/01/2026,
                Comisaría Provincial de Málaga — 200 folios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Las tres puertas ── */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Pruébalo ahora. Sin registrarte.
          </h2>
          <p className="text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            Se abre un despacho tuyo, con un año de archivo dentro, y puedes
            tocarlo todo: anotar actuaciones, crear presupuestos, imprimir el
            libro. Es tuyo y de nadie más — no altera los datos de nadie ni deja
            rastro en el de al lado.
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {PUERTAS.map((p) => (
              <button
                key={p.role}
                onClick={() => entrar(p.role)}
                disabled={loading !== null}
                className="text-left bg-card border border-border rounded-xl p-5 hover:border-brand-gold/50 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-wait group"
              >
                <p.icon className="w-5 h-5 text-brand-gold mb-3" />
                <p className="font-medium mb-1">{p.title}</p>
                <p className="text-sm text-muted-foreground leading-snug mb-4">
                  {p.desc}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {loading === p.role ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Preparando tu despacho...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground mt-5">
              Creando el despacho y rellenándolo con un año de trabajo. Tarda
              unos segundos.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-5 max-w-xl">
              {error}
            </p>
          )}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-wrap gap-3 justify-between text-xs text-muted-foreground">
          <p>DetectiveOS · Gestión para despachos de detectives privados</p>
          <p>Ley 5/2014 · Reglamento de Seguridad Privada · Orden INT/318/2011</p>
        </div>
      </footer>
    </div>
  )
}

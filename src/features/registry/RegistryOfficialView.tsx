import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { folioOf, type RegistryBookConfig } from '@/services/registryFolios'
import type { RegistryEntry } from '@/types'

// La misma vista por años sirve para trabajar, pero no para comprobar que
// el libro está bien. Esto es el modelo del Anexo VII tal cual sale
// impreso: las diez columnas en su orden, la cabecera de dos niveles, los
// asientos de más antiguo a más reciente y la línea gruesa donde acaba
// cada folio. Lo que se ve aquí es lo que va a salir por la impresora.

interface Props {
  entries: RegistryEntry[]
  config: RegistryBookConfig
}

const GRUPOS: { label: string | null; cols: { label: string; width: string }[] }[] = [
  {
    label: null,
    cols: [{ label: 'Número de orden', width: 'w-20' }],
  },
  {
    label: 'Encargo de investigación',
    cols: [
      { label: 'Fecha de inicio', width: 'w-24' },
      { label: 'Fecha de finalización', width: 'w-24' },
      { label: 'Asunto', width: 'min-w-[16rem]' },
    ],
  },
  {
    label: 'Contratante',
    cols: [
      { label: 'Nombre y apellidos o razón social', width: 'min-w-[11rem]' },
      { label: 'Domicilio/localidad', width: 'min-w-[11rem]' },
    ],
  },
  {
    label: 'Investigado',
    cols: [
      { label: 'Nombre y apellidos o razón social', width: 'min-w-[11rem]' },
      { label: 'Domicilio/localidad', width: 'min-w-[11rem]' },
    ],
  },
  {
    label: null,
    cols: [
      { label: 'Delitos perseguibles de oficio conocidos', width: 'min-w-[11rem]' },
      { label: 'Órgano al que se comunicaron', width: 'min-w-[10rem]' },
    ],
  },
]

function fmt(d: Date | undefined): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : ''
}

export function RegistryOfficialView({ entries, config }: Props) {
  const navigate = useNavigate()

  const ordenados = useMemo(
    () => [...entries].sort((a, b) => a.entryNumber - b.entryNumber),
    [entries]
  )

  const celda = 'border border-border px-2 py-1.5 align-top'

  return (
    <div>
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-xs border-collapse">
            <thead>
              <tr>
                {GRUPOS.map((g, gi) => (
                  <th
                    key={gi}
                    colSpan={g.cols.length}
                    rowSpan={g.label ? 1 : 2}
                    className="border border-border bg-muted px-2 py-1.5 text-xs font-semibold text-center align-middle"
                  >
                    {g.label ?? g.cols.map((c) => c.label).join(' · ')}
                  </th>
                ))}
              </tr>
              <tr>
                {GRUPOS.filter((g) => g.label).flatMap((g) =>
                  g.cols.map((c) => (
                    <th
                      key={g.label + c.label}
                      className={`border border-border bg-muted/60 px-2 py-1.5 text-[11px] font-medium text-center ${c.width}`}
                    >
                      {c.label}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((e, i) => {
                const folio = folioOf(e.entryNumber, config)
                const siguiente = ordenados[i + 1]
                // Línea gruesa donde acaba el folio: es la costura por la
                // que se separa una hoja sellada de la siguiente.
                const cierraFolio =
                  !siguiente || folioOf(siguiente.entryNumber, config) !== folio

                return (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/app/registry-book/${e.id}`)}
                    className={`cursor-pointer hover:bg-muted transition-colors ${
                      cierraFolio ? '[&>td]:border-b-2 [&>td]:border-b-foreground/40' : ''
                    }`}
                  >
                    <td className={`${celda} text-center font-mono tabular-nums font-semibold`}>
                      {e.entryNumber}
                    </td>
                    <td className={`${celda} tabular-nums whitespace-nowrap`}>
                      {fmt(e.startDate)}
                    </td>
                    <td className={`${celda} tabular-nums whitespace-nowrap`}>
                      {fmt(e.endDate)}
                    </td>
                    <td className={celda}>{e.investigationObject}</td>
                    <td className={celda}>{e.clientName}</td>
                    <td className={celda}>{e.clientAddress}</td>
                    <td className={celda}>{e.investigatedName}</td>
                    <td className={celda}>{e.investigatedAddress}</td>
                    <td className={celda}>{e.knownOffenses}</td>
                    <td className={celda}>{e.offensesReportedTo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Modelo del Anexo VII de la Orden INT/318/2011. La línea gruesa marca
        dónde acaba cada folio, a {config.rowsPerFolio} asientos por hoja. Al
        imprimir, cada folio sale en dos caras apaisadas que se colocan una al
        lado de la otra.
      </p>
    </div>
  )
}

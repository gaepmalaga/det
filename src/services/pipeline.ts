import type { Contact, Quote } from '@/types'

// Un contacto no tiene campo de estado, y es mejor así: el estado real de
// una oportunidad ya está escrito en sus presupuestos, y un campo aparte
// se quedaría desactualizado en cuanto alguien aceptase un presupuesto sin
// acordarse de cambiarlo. Aquí se deduce, así que no puede mentir.
export type OpportunityStage = 'nuevo' | 'borrador' | 'presupuestado' | 'ganado' | 'perdido'

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  nuevo: 'Sin presupuestar',
  borrador: 'Presupuesto sin enviar',
  presupuestado: 'Presupuesto enviado',
  ganado: 'Contratado',
  perdido: 'Descartado',
}

export const STAGE_HINTS: Record<OpportunityStage, string> = {
  nuevo: 'Alguien que ha preguntado y todavía no tiene ni precio calculado.',
  borrador: 'Ya tiene un precio calculado, pero el despacho aún no se lo ha dado al cliente.',
  presupuestado: 'Ya lo tiene el cliente y está pendiente de que decida.',
  ganado: 'Aceptó el presupuesto: a partir de aquí es cliente y tiene asunto.',
  perdido: 'Rechazó todo lo que se le ofreció.',
}

export interface Opportunity {
  contact: Contact
  quotes: Quote[]
  stage: OpportunityStage
  /** Importe en juego: el aceptado si lo hay, si no el último enviado. */
  amount?: number
  /** Última señal de vida, para ordenar por lo que se está enfriando. */
  lastActivity: Date
}

export function buildOpportunities(contacts: Contact[], quotes: Quote[]): Opportunity[] {
  const byContact = new Map<string, Quote[]>()
  quotes.forEach((q) => {
    const list = byContact.get(q.contactId)
    if (list) list.push(q)
    else byContact.set(q.contactId, [q])
  })

  return contacts.map((contact) => {
    const own = (byContact.get(contact.id) ?? []).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )

    const accepted = own.find((q) => q.status === 'aceptado')
    const pending = own.find((q) => q.status === 'enviado')
    const draft = own.find((q) => q.status === 'borrador')

    // Se comprueba en este orden porque son excluyentes por prioridad: si
    // hay uno aceptado ya es cliente, si hay uno enviado se está esperando
    // respuesta, si hay uno en borrador falta dárselo. Solo si no queda
    // ninguno de los tres es que todos los que hay están rechazados.
    const stage: OpportunityStage = accepted
      ? 'ganado'
      : pending
        ? 'presupuestado'
        : draft
          ? 'borrador'
          : own.length > 0
            ? 'perdido'
            : 'nuevo'

    return {
      contact,
      quotes: own,
      stage,
      amount: (accepted ?? pending ?? draft ?? own[0])?.amount,
      lastActivity: own[0]?.updatedAt ?? contact.updatedAt ?? contact.createdAt,
    }
  })
}

// Orden en el que se trabaja: primero lo que exige una acción del despacho
// (dar precio), después lo que espera respuesta del cliente, y al final lo
// que ya no requiere nada.
export const STAGE_ORDER: OpportunityStage[] = [
  'nuevo',
  'borrador',
  'presupuestado',
  'ganado',
  'perdido',
]

// Los contratados ya no son una oportunidad: son clientes, con su ficha y
// su asiento en el libro. Dejarlos aquí hacía que la pantalla mezclara a
// quien hay que llamar mañana con quien lleva tres asuntos cerrados —que
// era justo lo que había que arreglar.
export const OPEN_STAGES: OpportunityStage[] = ['nuevo', 'borrador', 'presupuestado', 'perdido']

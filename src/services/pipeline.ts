import type { Contact, Quote } from '@/types'

// Un contacto no tiene campo de estado, y es mejor así: el estado real de
// una oportunidad ya está escrito en sus presupuestos, y un campo aparte
// se quedaría desactualizado en cuanto alguien aceptase un presupuesto sin
// acordarse de cambiarlo. Aquí se deduce, así que no puede mentir.
export type OpportunityStage = 'nuevo' | 'presupuestado' | 'ganado' | 'perdido'

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  nuevo: 'Sin presupuestar',
  presupuestado: 'Presupuesto enviado',
  ganado: 'Contratado',
  perdido: 'Descartado',
}

export const STAGE_HINTS: Record<OpportunityStage, string> = {
  nuevo: 'Alguien que ha preguntado y todavía no ha recibido un precio.',
  presupuestado: 'Ya tiene precio y está pendiente de decidir.',
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

    const stage: OpportunityStage = accepted
      ? 'ganado'
      : pending
        ? 'presupuestado'
        : own.length > 0
          ? 'perdido'
          : 'nuevo'

    return {
      contact,
      quotes: own,
      stage,
      amount: (accepted ?? pending ?? own[0])?.amount,
      lastActivity: own[0]?.updatedAt ?? contact.updatedAt ?? contact.createdAt,
    }
  })
}

// Orden en el que se trabaja: primero lo que exige una acción del despacho
// (dar precio), después lo que espera respuesta del cliente, y al final lo
// que ya no requiere nada.
export const STAGE_ORDER: OpportunityStage[] = [
  'nuevo',
  'presupuestado',
  'ganado',
  'perdido',
]

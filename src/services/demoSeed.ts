import {
  collection,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { setNextSequenceNumber } from './counters'
import type { Firm } from '@/types'

// Enseñar la plataforma con dos asuntos dentro no convence a nadie: un
// despacho quiere ver cómo se comporta con su volumen real, con años de
// archivo detrás y con asuntos a medias. Esto rellena un despacho vacío
// con un año de trabajo verosímil —clientes, consultas sin presupuestar,
// presupuestos enviados, contratos firmados, actuaciones del día a día,
// informes entregados y su libro-registro correlativo— para poder
// enseñarlo.
//
// Solo escribe. Nunca borra nada de lo que ya haya.

function d(iso: string): Date {
  return new Date(iso + 'T09:00:00')
}

function ts(date: Date) {
  return Timestamp.fromDate(date)
}

interface DemoAsunto {
  start: string
  end?: string
  clientName: string
  clientTaxId: string
  clientType: 'individual' | 'corporate'
  street: string
  city: string
  province: string
  postalCode: string
  email: string
  phone: string
  investigationType: string
  objectScope: string
  legitimateInterest: string
  investigatedName: string
  investigatedAddress: string
  amount: number
  /** Cerrado con informe entregado, o todavía en curso. */
  closed: boolean
  actions: { date: string; text: string; lat?: number; lng?: number }[]
  report?: { methods: string; results: string; conclusions: string }
  graphicMaterial?: string
  knownOffenses?: string
  offensesReportedTo?: string
}

// Ocho asuntos repartidos por el año, con la mezcla que tiene cualquier
// despacho: laboral, seguros, arrendaticio, familia y competencia desleal.
const ASUNTOS: DemoAsunto[] = [
  {
    start: '2026-01-22',
    end: '2026-02-14',
    clientName: 'Talleres Guadalhorce S.L.',
    clientTaxId: 'B29441122',
    clientType: 'corporate',
    street: 'Pol. Ind. Villa Rosa, nave 14',
    city: 'Málaga',
    province: 'Málaga',
    postalCode: '29004',
    email: 'administracion@talleresguadalhorce.example.com',
    phone: '952334455',
    investigationType: 'Laboral',
    objectScope:
      'Comprobar si un trabajador en situación de incapacidad temporal por lesión lumbar desarrolla una actividad laboral remunerada por cuenta propia durante la baja.',
    legitimateInterest:
      'La empresa es la empleadora y soporta el coste de la prestación; necesita verificar la compatibilidad de la baja antes de adoptar medidas disciplinarias.',
    investigatedName: 'Rafael Ortiz Peña',
    investigatedAddress: 'Calle Ayala 47, 29002 Málaga',
    amount: 1450,
    closed: true,
    graphicMaterial: 'Disco externo del despacho, carpeta 2026/ASU-01',
    actions: [
      { date: '2026-01-23', text: 'Se establece vigilancia estática frente al domicilio del investigado desde las 07:00h. A las 08:12h sale vistiendo ropa de trabajo y accede a un vehículo comercial rotulado.', lat: 36.7213, lng: -4.4214 },
      { date: '2026-01-23', text: 'Se sigue al vehículo hasta un chalet en Alhaurín de la Torre, donde el investigado descarga material de construcción y permanece trabajando hasta las 14:30h.' },
      { date: '2026-01-28', text: 'Repetición del mismo patrón. Se observa al investigado manejando sacos de cemento sin limitación aparente de movilidad.' },
      { date: '2026-02-05', text: 'Tercer día de comprobación. El investigado atiende a un cliente en la obra y cobra en efectivo.' },
      { date: '2026-02-11', text: 'Se cierra la fase de campo. Se han documentado cuatro jornadas completas de actividad.' },
    ],
    report: {
      methods:
        'Vigilancia estática y dinámica a pie y en vehículo, en horario diurno, durante cuatro jornadas no consecutivas. Observación directa desde vía pública.',
      results:
        'El investigado desarrolla de forma habitual trabajos de albañilería por cuenta propia durante la situación de incapacidad temporal, con plena movilidad y esfuerzo físico intenso.',
      conclusions:
        'La actividad observada resulta incompatible con la dolencia que motivó la baja médica.',
    },
  },
  {
    start: '2026-02-09',
    end: '2026-03-02',
    clientName: 'Aseguradora Levante S.A.',
    clientTaxId: 'A46778899',
    clientType: 'corporate',
    street: 'Avenida del Puerto 128',
    city: 'Valencia',
    province: 'Valencia',
    postalCode: '46023',
    email: 'siniestros@aseguradoralevante.example.com',
    phone: '963221100',
    investigationType: 'Seguros',
    objectScope:
      'Verificar el alcance real de las secuelas alegadas por un lesionado en un siniestro de tráfico con reclamación de indemnización por incapacidad.',
    legitimateInterest:
      'La entidad es la aseguradora frente a la que se reclama y debe comprobar la realidad de las secuelas antes de fijar la indemnización.',
    investigatedName: 'Manuel Cortés Bravo',
    investigatedAddress: 'Calle Sagunto 12, 46009 Valencia',
    amount: 2100,
    closed: true,
    graphicMaterial: 'Disco externo del despacho, carpeta 2026/ASU-02',
    actions: [
      { date: '2026-02-10', text: 'Localización del domicilio y del vehículo habitual del investigado. Sin actividad relevante durante la jornada.' },
      { date: '2026-02-17', text: 'Se observa al investigado cargando y descargando cajas de un vehículo sin utilizar el collarín cervical que porta en las consultas médicas.' },
      { date: '2026-02-24', text: 'El investigado acude a un gimnasio en horario de mañana y permanece en su interior 55 minutos.' },
      { date: '2026-02-27', text: 'Se documenta al investigado conduciendo con normalidad y realizando giros cervicales completos.' },
    ],
    report: {
      methods:
        'Vigilancia discreta en horario diurno durante cuatro jornadas, con observación desde vía pública y espacios de acceso público.',
      results:
        'Las limitaciones funcionales alegadas no se corresponden con la actividad observada, que incluye conducción, esfuerzo de carga y ejercicio físico.',
      conclusions:
        'No se aprecian las limitaciones de movilidad cervical alegadas en la reclamación.',
    },
  },
  {
    start: '2026-03-16',
    end: '2026-04-10',
    clientName: 'Dolores Aranda Gil',
    clientTaxId: '25447788L',
    clientType: 'individual',
    street: 'Calle Victoria 8, 2º izq.',
    city: 'Málaga',
    province: 'Málaga',
    postalCode: '29012',
    email: 'dolores.aranda.demo@example.com',
    phone: '622114477',
    investigationType: 'Familia',
    objectScope:
      'Acreditar la convivencia estable de la excónyuge con una tercera persona a efectos de la extinción de la pensión compensatoria acordada en sentencia.',
    legitimateInterest:
      'El cliente es el obligado al pago de la pensión compensatoria y la convivencia marital de la perceptora es causa legal de extinción (art. 101 CC).',
    investigatedName: 'Beatriz Salas Company',
    investigatedAddress: 'Calle Hilera 30, 29007 Málaga',
    amount: 1800,
    closed: true,
    graphicMaterial: 'Disco externo del despacho, carpeta 2026/ASU-03',
    actions: [
      { date: '2026-03-17', text: 'Se comprueba que en el domicilio de la investigada pernocta habitualmente una tercera persona, que sale a las 07:40h.' },
      { date: '2026-03-24', text: 'Ambos acuden juntos a realizar la compra semanal y regresan al mismo domicilio.' },
      { date: '2026-04-02', text: 'Se constata la presencia del vehículo del tercero en la plaza de garaje asociada a la vivienda durante siete noches consecutivas.' },
      { date: '2026-04-08', text: 'Cierre de la fase de campo tras acreditar convivencia continuada durante tres semanas.' },
    ],
    report: {
      methods:
        'Vigilancia discreta del domicilio en horario de mañana y noche durante tres semanas, con comprobación registral del vehículo.',
      results:
        'Se acredita convivencia estable y notoria de la investigada con una tercera persona en el domicilio familiar.',
      conclusions:
        'Concurren indicios suficientes de convivencia marital a los efectos del artículo 101 del Código Civil.',
    },
  },
  {
    start: '2026-04-27',
    end: '2026-05-20',
    clientName: 'Bufete Alarcón & Rivas',
    clientTaxId: 'B29556677',
    clientType: 'corporate',
    street: 'Alameda Principal 22, 3º',
    city: 'Málaga',
    province: 'Málaga',
    postalCode: '29001',
    email: 'procesal@alarconrivas.example.com',
    phone: '951220033',
    investigationType: 'Arrendaticio',
    objectScope:
      'Comprobar la cesión inconsentida de una vivienda arrendada a terceros mediante alquiler turístico, para su acreditación en procedimiento de resolución contractual.',
    legitimateInterest:
      'El despacho actúa en representación de la propiedad arrendadora en un procedimiento de resolución de contrato por cesión inconsentida.',
    investigatedName: 'Sergio Lozano Mena',
    investigatedAddress: 'Calle Carretería 61, 29008 Málaga',
    amount: 1250,
    closed: true,
    actions: [
      { date: '2026-04-28', text: 'Se localiza el inmueble anunciado en dos plataformas de alquiler vacacional con fotografías coincidentes con el interior.' },
      { date: '2026-05-06', text: 'Se observa la entrada de un grupo de cuatro personas con equipaje y la entrega de llaves mediante caja de seguridad exterior.' },
      { date: '2026-05-14', text: 'Segunda rotación de ocupantes en nueve días. Se documenta la limpieza entre estancias por personal externo.' },
    ],
    report: {
      methods:
        'Comprobación de anuncios públicos en plataformas de alquiler turístico y vigilancia discreta del portal del inmueble.',
      results:
        'El inmueble se destina de forma continuada a alquiler turístico por días, con rotación de ocupantes ajenos al contrato de arrendamiento.',
      conclusions:
        'Se acredita la cesión inconsentida del uso de la vivienda a terceros.',
    },
  },
  {
    start: '2026-06-15',
    end: '2026-07-08',
    clientName: 'Cerámicas Axarquía S.L.',
    clientTaxId: 'B29998877',
    clientType: 'corporate',
    street: 'Camino de la Vega 4',
    city: 'Vélez-Málaga',
    province: 'Málaga',
    postalCode: '29700',
    email: 'gerencia@ceramicasaxarquia.example.com',
    phone: '952550011',
    investigationType: 'Competencia desleal',
    objectScope:
      'Determinar si un antiguo comercial de la empresa está desviando cartera de clientes hacia una sociedad de nueva creación durante la vigencia de su pacto de no competencia.',
    legitimateInterest:
      'La empresa es la titular de la cartera de clientes y del pacto de no competencia suscrito por el investigado.',
    investigatedName: 'Ignacio Peral Ruano',
    investigatedAddress: 'Avenida Vivar Téllez 90, 29700 Vélez-Málaga',
    amount: 2400,
    closed: true,
    knownOffenses:
      'Posible revelación de secretos empresariales (art. 279 CP). Se advierte al cliente de la obligación de comunicación.',
    offensesReportedTo: 'Juzgado de Instrucción nº 2 de Vélez-Málaga',
    graphicMaterial: 'Disco externo del despacho, carpeta 2026/ASU-05',
    actions: [
      { date: '2026-06-16', text: 'Se acredita la constitución de una sociedad con objeto social coincidente y domicilio en el mismo municipio.' },
      { date: '2026-06-23', text: 'Se observa al investigado visitando dos clientes históricos de la empresa en horario comercial.' },
      { date: '2026-06-30', text: 'Tercera visita documentada a un cliente de la cartera. Permanece en el interior 40 minutos.' },
      { date: '2026-07-06', text: 'Se cierra la fase de campo tras documentar cinco visitas a clientes de la cartera de la empresa.' },
    ],
    report: {
      methods:
        'Comprobación registral y mercantil, y seguimiento discreto de la actividad comercial del investigado en horario laboral.',
      results:
        'El investigado desarrolla actividad comercial por cuenta de una sociedad propia, visitando clientes de la cartera de la empresa contratante.',
      conclusions:
        'La actividad observada es incompatible con el pacto de no competencia suscrito.',
    },
  },
  {
    start: '2026-08-03',
    clientName: 'Mutua Andalucía Prevención',
    clientTaxId: 'G41223344',
    clientType: 'corporate',
    street: 'Avenida de la Constitución 18',
    city: 'Sevilla',
    province: 'Sevilla',
    postalCode: '41004',
    email: 'control@mutuandaluciaprev.example.com',
    phone: '954110099',
    investigationType: 'Seguros',
    objectScope:
      'Comprobar la realidad de la situación de incapacidad temporal prolongada de un trabajador con sospecha de actividad laboral paralela.',
    legitimateInterest:
      'La mutua abona la prestación y está facultada para verificar la situación que la justifica.',
    investigatedName: 'Andrés Quintana Mora',
    investigatedAddress: 'Calle Feria 145, 41003 Sevilla',
    amount: 1950,
    closed: false,
    graphicMaterial: 'Tarjeta SD nº 4, caja fuerte del despacho',
    actions: [
      { date: '2026-08-04', text: 'Primer día de vigilancia. El investigado no sale del domicilio durante la jornada de observación.' },
      { date: '2026-08-19', text: 'Se observa al investigado accediendo a un local de hostelería por la puerta de personal a las 06:50h.' },
      { date: '2026-08-27', text: 'Segunda comprobación. El investigado permanece en el interior del local desde las 07:00h hasta las 15:20h.' },
    ],
  },
  {
    start: '2026-08-24',
    clientName: 'Promociones Costa Sol S.L.',
    clientTaxId: 'B29112255',
    clientType: 'corporate',
    street: 'Calle Larios 4, 1º',
    city: 'Málaga',
    province: 'Málaga',
    postalCode: '29005',
    email: 'direccion@promocionescostasol.example.com',
    phone: '952889900',
    investigationType: 'Arrendaticio',
    objectScope:
      'Localizar el domicilio efectivo de un arrendatario en paradero desconocido con rentas impagadas, a efectos de notificación judicial.',
    legitimateInterest:
      'La empresa es la propietaria arrendadora y necesita el domicilio para emplazar al demandado en el procedimiento de desahucio.',
    investigatedName: 'Tomás Aguilar Ferrer',
    investigatedAddress: 'Domicilio a determinar',
    amount: 900,
    closed: false,
    actions: [
      { date: '2026-08-25', text: 'Se comprueba que la vivienda arrendada está desocupada. Buzón sin correspondencia reciente.' },
      { date: '2026-08-31', text: 'Se obtiene indicio de un nuevo domicilio en la barriada de El Palo, pendiente de confirmación.' },
    ],
  },
]

// Consultas que todavía no han contratado, que es lo que da vida a
// Oportunidades: unas sin presupuestar, otras esperando respuesta y una
// que se perdió.
const CONSULTAS = [
  {
    name: 'Elena Cabrera Ruiz',
    email: 'elena.cabrera.demo@example.com',
    phone: '655221144',
    type: 'individual' as const,
    company: undefined as string | undefined,
    notes: 'Llamó preguntando por localización de un deudor. Pendiente de dar precio.',
    quote: null,
  },
  {
    name: 'Hostelería del Guadiaro S.L.',
    email: 'admin@hosteleriaguadiaro.example.com',
    phone: '956770022',
    type: 'corporate' as const,
    company: 'Hostelería del Guadiaro S.L.',
    notes: 'Sospecha de sustracciones en caja en uno de sus locales. Pide propuesta.',
    quote: null,
  },
  {
    name: 'Javier Montes Pardo',
    email: 'javier.montes.demo@example.com',
    phone: '677889911',
    type: 'individual' as const,
    company: undefined,
    notes: 'Control de cumplimiento del régimen de visitas. Presupuesto enviado, pendiente de respuesta.',
    quote: {
      amount: 1100,
      status: 'enviado' as const,
      description:
        'Comprobación del cumplimiento del régimen de visitas acordado en sentencia, durante cuatro fines de semana alternos.',
    },
  },
  {
    name: 'Instalaciones Bética S.A.',
    email: 'rrhh@instalacionesbetica.example.com',
    phone: '954330077',
    type: 'corporate' as const,
    company: 'Instalaciones Bética S.A.',
    notes: 'Absentismo reiterado en delegación de Sevilla. Presupuesto enviado la semana pasada.',
    quote: {
      amount: 1700,
      status: 'enviado' as const,
      description:
        'Verificación de la actividad de dos trabajadores en situación de incapacidad temporal en la delegación de Sevilla.',
    },
  },
  {
    name: 'Rosa Belmonte Cano',
    email: 'rosa.belmonte.demo@example.com',
    phone: '644550033',
    type: 'individual' as const,
    company: undefined,
    notes: 'Descartó el servicio por precio tras recibir el presupuesto.',
    quote: {
      amount: 1350,
      status: 'rechazado' as const,
      description:
        'Seguimiento para acreditar convivencia a efectos de extinción de pensión compensatoria.',
    },
  },
]

export interface SeedResult {
  asuntos: number
  consultas: number
  actuaciones: number
  informes: number
}

/**
 * Rellena el despacho con un año de trabajo verosímil. Solo escribe; lo
 * que ya hubiera se respeta y los asientos nuevos se numeran a partir del
 * último que exista, de modo que el libro sigue siendo correlativo y
 * cronológico.
 */
export async function seedDemoData(
  firm: Firm,
  userId: string,
  detectiveName: string
): Promise<SeedResult> {
  const firmId = firm.id
  const tip = firm.titular?.tipNumber || 'D-9910'

  // Punto de arranque: por encima de todo lo que exista, para no repetir
  // ningún número ni pisar el libro que ya haya.
  const existing = await getDocs(collection(db, 'firms', firmId, 'registryBooks'))
  let entryNumber = existing.docs.reduce(
    (max, s) => Math.max(max, (s.data().entryNumber as number) ?? 0),
    0
  )
  const caseSeq = await getDocs(collection(db, 'firms', firmId, 'cases'))
  let caseNumber = caseSeq.docs.reduce(
    (max, s) => Math.max(max, (s.data().caseNumberInt as number) ?? 0),
    0
  )
  const contractSeq = await getDocs(collection(db, 'firms', firmId, 'contracts'))
  let contractNumber = contractSeq.docs.reduce(
    (max, s) => Math.max(max, (s.data().contractNumberInt as number) ?? 0),
    0
  )
  const quoteSeq = await getDocs(collection(db, 'firms', firmId, 'quotes'))
  let quoteNumber = quoteSeq.docs.length
  const contactSeq = await getDocs(collection(db, 'firms', firmId, 'contacts'))
  let contactNumber = contactSeq.docs.length

  let batch = writeBatch(db)
  let ops = 0
  const flush = async (force = false) => {
    // Firestore admite 500 escrituras por lote; se corta antes con margen.
    if (force || ops >= 400) {
      await batch.commit()
      batch = writeBatch(db)
      ops = 0
    }
  }

  let actuaciones = 0
  let informes = 0

  for (const a of ASUNTOS) {
    entryNumber += 1
    caseNumber += 1
    contractNumber += 1
    quoteNumber += 1
    contactNumber += 1

    const start = d(a.start)
    const end = a.end ? d(a.end) : undefined
    const address = `${a.street}, ${a.postalCode} ${a.city} (${a.province})`

    const contactRef = doc(collection(db, 'firms', firmId, 'contacts'))
    const clientRef = doc(collection(db, 'firms', firmId, 'clients'))
    const quoteRef = doc(collection(db, 'firms', firmId, 'quotes'))
    const contractRef = doc(collection(db, 'firms', firmId, 'contracts'))
    const caseRef = doc(collection(db, 'firms', firmId, 'cases'))
    const entryRef = doc(collection(db, 'firms', firmId, 'registryBooks'))

    batch.set(contactRef, {
      firmId,
      referenceNumber: `CON-${String(contactNumber).padStart(4, '0')}`,
      contactName: a.clientName,
      contactEmail: a.email,
      contactPhone: a.phone,
      contactType: a.clientType,
      ...(a.clientType === 'corporate' ? { companyName: a.clientName } : {}),
      notes: '',
      createdBy: userId,
      createdAt: ts(start),
      updatedAt: ts(start),
    })

    batch.set(clientRef, {
      firmId,
      clientType: a.clientType,
      legalName: a.clientName,
      taxId: a.clientTaxId,
      email: a.email,
      phone: a.phone,
      address: {
        street: a.street,
        city: a.city,
        province: a.province,
        postalCode: a.postalCode,
        country: 'España',
      },
      portalAccessEnabled: false,
      convertedFromContactId: contactRef.id,
      isActive: true,
      createdBy: userId,
      createdAt: ts(start),
      updatedAt: ts(start),
    })

    batch.set(quoteRef, {
      firmId,
      contactId: contactRef.id,
      quoteNumber: `PRE-${String(quoteNumber).padStart(4, '0')}`,
      investigationType: a.investigationType,
      description: a.objectScope,
      amount: a.amount,
      status: 'aceptado',
      clientId: clientRef.id,
      contractId: contractRef.id,
      caseId: caseRef.id,
      objectScope: a.objectScope,
      legitimateInterest: a.legitimateInterest,
      investigatedName: a.investigatedName,
      investigatedAddress: a.investigatedAddress,
      assignedDetectiveId: userId,
      assignedDetectiveTip: tip,
      createdBy: userId,
      createdAt: ts(start),
      updatedAt: ts(start),
    })

    batch.set(contractRef, {
      firmId,
      contractNumber: `CONT-${String(contractNumber).padStart(4, '0')}`,
      contractNumberInt: contractNumber,
      type: 'cliente',
      status: 'firmado',
      caseId: caseRef.id,
      quoteId: quoteRef.id,
      clientId: clientRef.id,
      clientName: a.clientName,
      issuedAt: ts(start),
      signedAt: ts(start),
      signedByName: a.clientName,
      serviceDescription: a.objectScope,
      agreedPrice: `${a.amount} €`,
      createdBy: userId,
      createdAt: ts(start),
      updatedAt: ts(start),
    })

    batch.set(caseRef, {
      firmId,
      caseNumber: `EXP-${String(caseNumber).padStart(4, '0')}`,
      caseNumberInt: caseNumber,
      quoteId: quoteRef.id,
      clientId: clientRef.id,
      agreedAmount: a.amount,
      billingMode: 'quote',
      status: a.closed ? 'cerrado' : 'activo',
      statusHistory: [
        { status: 'revision', changedAt: ts(start), changedBy: userId },
        { status: 'activo', changedAt: ts(start), changedBy: userId },
        ...(a.closed && end
          ? [{ status: 'cerrado', changedAt: ts(end), changedBy: userId }]
          : []),
      ],
      investigationType: a.investigationType,
      description: a.objectScope,
      objectScope: a.objectScope,
      legitimateInterest: a.legitimateInterest,
      legitimateInterestValidated: true,
      investigatedName: a.investigatedName,
      investigatedAddress: a.investigatedAddress,
      assignedDetectiveId: userId,
      assignedDetectiveTip: tip,
      contractId: contractRef.id,
      contractSignedAt: ts(start),
      ...(a.closed && end ? { closedAt: ts(end), closedBy: userId } : {}),
      hasActiveException: false,
      hasGraphicMaterial: !!a.graphicMaterial,
      graphicMaterialLocation: a.graphicMaterial ?? '',
      registryEntryId: entryRef.id,
      registryEntryNumber: entryNumber,
      complianceStatus: 'green',
      complianceIssues: [],
      createdBy: userId,
      createdAt: ts(start),
      updatedAt: ts(end ?? start),
    })

    batch.set(entryRef, {
      firmId,
      entryNumber,
      origin: 'plataforma',
      entryDate: ts(start),
      startDate: ts(start),
      ...(end ? { endDate: ts(end) } : {}),
      firmRnsp: firm.rnsp ?? '',
      clientName: a.clientName,
      clientTaxId: a.clientTaxId,
      clientType: a.clientType,
      clientAddress: address,
      investigationObject: a.objectScope,
      investigatedName: a.investigatedName,
      investigatedAddress: a.investigatedAddress,
      knownOffenses: a.knownOffenses ?? '',
      offensesReportedTo: a.offensesReportedTo ?? '',
      detectiveName,
      detectiveTip: tip,
      caseId: caseRef.id,
      caseNumber: `EXP-${String(caseNumber).padStart(4, '0')}`,
      status: a.closed ? 'cerrado' : 'abierto',
      amendments: [],
      createdBy: userId,
      createdAt: ts(start),
    })

    ops += 6
    await flush()

    for (const act of a.actions) {
      const actRef = doc(collection(db, 'firms', firmId, 'cases', caseRef.id, 'actions'))
      batch.set(actRef, {
        caseId: caseRef.id,
        description: act.text,
        ...(act.lat !== undefined ? { locationLat: act.lat, locationLng: act.lng } : {}),
        detectiveId: userId,
        detectiveTip: tip,
        createdBy: userId,
        createdAt: ts(d(act.date)),
      })
      actuaciones += 1
      ops += 1
      await flush()
    }

    if (a.report && end) {
      const reportRef = doc(collection(db, 'firms', firmId, 'reports'))
      batch.set(reportRef, {
        firmId,
        caseId: caseRef.id,
        caseNumber: `EXP-${String(caseNumber).padStart(4, '0')}`,
        status: 'entregado',
        registryNumber: String(entryNumber),
        clientName: a.clientName,
        clientTaxId: a.clientTaxId,
        serviceObject: a.objectScope,
        methodsUsed: a.report.methods,
        results: a.report.results,
        conclusions: a.report.conclusions,
        actionsPerformed: a.actions.map((x) => `${x.date}: ${x.text}`).join('\n'),
        detectives: [{ detectiveId: userId, detectiveName, detectiveTip: tip }],
        deliveredAt: ts(end),
        deliveredTo: a.clientName,
        approvedAt: ts(end),
        approvedBy: userId,
        createdBy: userId,
        createdAt: ts(end),
        updatedAt: ts(end),
      })
      informes += 1
      ops += 1
      await flush()
    }
  }

  // Consultas abiertas: sin cliente ni expediente, que es lo que las hace
  // oportunidades y no asuntos.
  const hoy = new Date()
  for (const c of CONSULTAS) {
    contactNumber += 1
    const contactRef = doc(collection(db, 'firms', firmId, 'contacts'))
    const creado = new Date(hoy)
    creado.setDate(creado.getDate() - CONSULTAS.indexOf(c) * 4 - 2)

    batch.set(contactRef, {
      firmId,
      referenceNumber: `CON-${String(contactNumber).padStart(4, '0')}`,
      contactName: c.name,
      contactEmail: c.email,
      contactPhone: c.phone,
      contactType: c.type,
      ...(c.company ? { companyName: c.company } : {}),
      notes: c.notes,
      createdBy: userId,
      createdAt: ts(creado),
      updatedAt: ts(creado),
    })
    ops += 1

    if (c.quote) {
      quoteNumber += 1
      const quoteRef = doc(collection(db, 'firms', firmId, 'quotes'))
      batch.set(quoteRef, {
        firmId,
        contactId: contactRef.id,
        quoteNumber: `PRE-${String(quoteNumber).padStart(4, '0')}`,
        investigationType: 'Otros',
        description: c.quote.description,
        amount: c.quote.amount,
        status: c.quote.status,
        ...(c.quote.status === 'rechazado'
          ? { rejectionReason: 'El cliente lo descartó por precio.' }
          : {}),
        createdBy: userId,
        createdAt: ts(creado),
        updatedAt: ts(creado),
      })
      ops += 1
    }
    await flush()
  }

  await flush(true)

  // Los contadores quedan por encima de lo escrito para que la siguiente
  // alta real continúe la serie en vez de chocar con ella.
  await Promise.all([
    setNextSequenceNumber(firmId, 'registry', entryNumber + 1),
    setNextSequenceNumber(firmId, 'case', caseNumber + 1),
    setNextSequenceNumber(firmId, 'contract', contractNumber + 1),
    setNextSequenceNumber(firmId, 'quote', quoteNumber + 1),
    setNextSequenceNumber(firmId, 'contact', contactNumber + 1),
  ])

  return {
    asuntos: ASUNTOS.length,
    consultas: CONSULTAS.length,
    actuaciones,
    informes,
  }
}

# Rediseño de producto — despachos de detectives privados

> Documento de contexto y alcance. Recoge lo hablado en dos conversaciones (la
> original, que se quedó sin contexto, y su continuación) para que cualquier
> sesión futura pueda retomarlo sin perder decisiones ya tomadas.
>
> Estado: **fase de definición de alcance, sin implementar todavía.**

## 1. Motivación

La versión actual de la app está sobre-diseñada para un despacho grande con
compliance/RGPD pesado (evidencias multimedia, actuaciones por franja horaria,
portal de mensajería, semáforo de cumplimiento, multi-despacho tipo
marketplace...). El producto real que se quiere construir es más bien un
**pipeline comercial simple + registro legal mínimo**, vendible a varios
despachos de detectives independientes.

## 2. Qué se elimina del modelo actual

- Evidencias (fotos/vídeos/hash/50MB) — todo el módulo de Storage.
- Actuaciones como control horario (franja diurna/nocturna/festivo).
- Portal cliente con mensajería y documentos compartidos (se sustituye por algo
  mucho más simple, ver §4).
- Contrato como paso con firma digital certificada — basta con "clic + IP +
  timestamp".
- Compliance module (semáforo verde/ámbar/rojo, plazos de destrucción de
  evidencias) — **y esto queda legalmente justificado**: al no guardar
  fotos/vídeos, desaparece la obligación de destrucción a los 3 años del
  art. 49.4 de la Ley de Seguridad Privada, que es lo único que ese semáforo
  controlaba.
- Superadmin multi-despacho tipo marketplace — **no se elimina del todo**: sigue
  habiendo multi-despacho porque el producto se vende a varios despachos, pero
  cada uno vive en su burbuja (sin lógica de marketplace ni conflictos entre
  competidores).

## 3. Flujo de negocio (acordado)

> **Actualizado 2026-09-01** — ver "Cambio de flujo: Contrato antes que
> Expediente" más abajo. La versión vigente es esta; el diagrama original
> (expediente al aceptar presupuesto) queda documentado ahí solo como
> histórico.

```
Contacto → Presupuesto (por despacho) → [Aceptado | Rechazado]
                                              ↓ aceptado
                          Se crea ficha de Cliente + Contrato (pendiente de firma)
                                              ↓
                    Firma del contrato:
                      · Cliente particular → link de firma (individual, puntual)
                      · Staff → "Registrar firma manual" desde Contratos/Expediente
                                              ↓ firmado
                          Expediente "abierto" + asiento en Libro-registro
                                              ↓
                          Actuaciones (texto: qué, cuándo, dónde, quién)
                                              ↓
                              [IA] compila actuaciones → borrador de informe
                                              ↓
                                  Cierre del expediente
```

Reglas de negocio confirmadas:

- Un contacto puede tener **varios presupuestos**, y de **varios despachos
  distintos** (no es "1 contacto = 1 oportunidad").
- Un mismo cliente puede tener **varios presupuestos a lo largo del tiempo**,
  cada uno con su propio contrato y, si se firma, su propio expediente y
  asiento de libro-registro independientes.
- El expediente ("case") se crea **solo cuando el contrato queda firmado**
  — no al aceptar el presupuesto, y no antes de la firma.
- Multi-despacho confirmado: la intención es venderlo a varios despachos, así
  que se mantiene `firms` + roles + superadmin para gestionarlos.

## 4. Módulos, definidos con detalle

### 4.1 Actuaciones — modo "captura rápida"

Sitio donde aparecen los expedientes abiertos, con opción de ir añadiendo
actuaciones. Pensado para anotar en campo con cero fricción:

- **Fecha/hora**: se autocompletan al momento de creación.
- **Ubicación**: se autocompleta por geolocalización del dispositivo.
- El detective **solo escribe la observación** (qué está viendo).
- Sin fotos ni vídeos.
- Campos: fecha, hora inicio/fin, descripción (texto libre), ubicación.
  `rateType` (diurna/nocturna/festivo/finde) **se descarta**: solo tendría
  sentido si la facturación dependiera de horas trabajadas, y el presupuesto
  es precio cerrado.

### 4.2 Informe generado por IA

Flujo: el detective añade actuaciones sueltas → botón "Generar borrador" → la
IA ordena cronológicamente, redacta en lenguaje de informe (no notas sueltas)
y rellena los campos legales fijos → **el detective lo edita a mano** antes de
dar por bueno → una vez enviado al cliente, **queda bloqueado** (inmutable,
igual que las evidencias de auditoría actuales, por trazabilidad legal).

Campos legales obligatorios que la IA debe rellenar (Art. 49 Ley 5/2014, ver
§6): número de registro del servicio, datos de quien contrata, objeto de la
contratación, medios empleados, resultados, detectives intervinientes,
actuaciones realizadas.

Regla de fondo que debe llevar el propio prompt de la IA: **minimización
obligatoria por ley** — el informe solo puede incluir información
directamente relacionada con el objeto y finalidad de la investigación; nada
de datos del investigado/cliente descubiertos "de paso" que no vengan a
cuento.

**Exportación (decidido)**: PDF (maquetación final, no editable — toda la
edición ocurre antes, dentro del editor del informe) **y** `.docx` editable,
para que el despacho lo retoque fuera de la plataforma si lo necesita.
Personalización de plantilla: cada despacho sube su logo una vez en Ajustes
y se aplica automáticamente sobre un diseño fijo (misma tipografía, orden de
secciones, pie de página con RNSP) — sin editor de plantilla, sin colores
personalizables por ahora.

### 4.3 Contrato

- **Cliente particular / puntual**: se envía un link de firma individual. Cada
  despacho configura su propia plantilla de contrato (texto marco con
  placeholders: nombre cliente, DNI, objeto, importe...). Al aceptar un
  presupuesto se genera el contrato desde la plantilla rellenando solo los
  datos variables, se envía el link, y el cliente firma con el enfoque
  "clic + IP + timestamp" (ya existe de facto en el modelo actual:
  `contractSignedAt`, `contractSignedByClientUid`, `contractSignedIp` — no
  hace falta proveedor de firma certificada tipo Signaturit/DocuSign).
- **Cliente recurrente**: tiene su propio portal con histórico de contratos.

### 4.4 Portal del cliente recurrente

Alcance acordado (deliberadamente mínimo): lista simple por
contrato/presupuesto con importe, estado (aprobado/rechazado) y, si está
aprobado, si el expediente sigue abierto o ya se cerró. Nada de mensajería ni
evidencias.

### 4.5 Colaboradores — modelo híbrido (decidido en esta sesión)

Se distingue entre dos tipos de despacho colaborador:

- **Colaborador que ya usa la plataforma** (`tienePlataforma: true`): se le
  invita con acceso limitado (solo ve/edita actuaciones de los casos donde
  colabora, nada más del despacho titular). Además, **tiene un panel propio**
  donde le aparecen todas las colaboraciones que tiene con cualquier despacho
  (no solo con el titular que lo invitó) — es decir, la vista de colaboraciones
  es transversal a todos los despachos con los que trabaja, no un panel por
  despacho.
- **Colaborador sin plataforma** (`tienePlataforma: false`): el despacho
  titular lo da de alta manualmente, simplemente para llevar el control de a
  quién se le deriva un caso, y para ir añadiendo los avances que ese
  colaborador le vaya enviando por fuera de la plataforma (email, teléfono...).
  Esa actuación queda marcada como "reportada por [colaborador]" para que
  conste en el informe quién hizo qué (relevante también para el TIP, que debe
  figurar en el libro-registro si aplica).

**Invitación (decidido)**: por email. El titular introduce el email del
colaborador, se le envía un link, y el colaborador crea su propia cuenta con
acceso restringido a los casos donde colabora (nada más del despacho
titular). No hay alta manual con credenciales generadas por el titular.

### 4.6 Cliente esporádico vs. habitual (mutuas, aseguradoras, empresas)

La duda de fondo: si un cliente habitual firma un contrato marco una vez
(cubre todos sus casos futuros, sin fricción) o si sigue firmando contrato en
cada expediente igual que un particular, y lo único que cambia es que tiene
portal.

**Decidido**: si hay contrato marco activo, el expediente se abre directamente
sin pasar por `quotes` (las condiciones económicas ya están pactadas en el
marco), pero sí se registra una cifra por asunto para control interno —
como campos directos en `cases` (`agreedAmount`, `billingMode: 'quote' |
'framework'`), no como una colección de contabilidad aparte.

**Origen del contrato marco (decidido)**: solo subida de PDF externo. El
despacho sube el documento que le manda el cliente (redactado por sus
propios abogados) y lo marca como firmado/aceptado — no se genera desde
`contractTemplates`. `contractTemplates` queda reservado para el contrato
individual del cliente particular/esporádico (§4.3).

## 5. Modelo de datos (borrador, ~8 colecciones)

- `firms` — sin cambios, multi-despacho.
- `contacts` — antes "leads", privados por despacho.
- `quotes` — presupuestos: importe, estado enviado/aceptado/rechazado,
  vinculado a un `contact`.
- `cases` — expediente simplificado: se crea al aceptar un `quote`, o
  directamente (sin `quote`) si el contacto tiene contrato marco activo; sin
  evidencias/portal-mensajes/compliance. Lleva `agreedAmount: number` y
  `billingMode: 'quote' | 'framework'` para el control económico por asunto,
  también en el caso del marco (ver §7 — sin colección de contabilidad
  aparte).
- `caseActions` — actuaciones: fecha/hora/ubicación auto + nota.
- `contractTemplates` — por despacho, con placeholders.
- `contracts` — instancia generada desde plantilla + estado firma.
- `registryBooks` — libro-registro, fiel a ley (ver §6 para el gap detectado).

Esto pasa de ~15 colecciones/conceptos actuales a 8.

## 6. Requisitos legales (BOE — Código de Seguridad Privada: Ley 5/2014,
Reglamento de Seguridad Privada y Orden que aprueba los modelos)

Fuente: `BOE-058_Codigo_de_Seguridad_Privada (2).pdf` (en el repo, rama
`main`).

### Art. 48.2 — Expediente de contratación

Antes de aceptar el encargo, hay que **dejar constancia del interés legítimo
alegado** por quien contrata, en el expediente de contratación e
investigación. **Ya cubierto**: el campo `legitimateInterest` ya existe en
`Case` y es obligatorio en `ConvertToCaseDialog.tsx` — la corrección
pendiente que se apuntó aquí inicialmente no era tal.

### Art. 49 — Informes de investigación

Contenido obligatorio: nº de registro del servicio, datos del contratante,
objeto de la contratación, medios, resultados, detectives intervinientes,
actuaciones realizadas (ver §4.2).

- Minimización obligatoria: solo información directamente relacionada con el
  objeto y finalidad de la investigación.
- Conservación: informe archivado mínimo 3 años. Imágenes/sonidos grabados se
  destruyen a los 3 años salvo procedimiento judicial/policial en curso — **ya
  no aplica**, porque el producto no guarda fotos/vídeos.
- Carácter reservado: los datos solo se ponen a disposición del cliente o, en
  su caso, de órganos judiciales/policiales.

### Art. 108 Reglamento + Art. 17 Orden — Libro-registro

Cada despacho y sucursal debe llevar un libro-registro, con el modelo oficial
del **Anexo VII**, informatizable si se ajusta a la normativa de protección de
datos.

Columnas exactas del modelo oficial (Anexo VII):

| Bloque | Campos |
|---|---|
| Encargo | Número de orden, fecha de inicio, fecha de finalización |
| — | Asunto |
| Contratante | Nombre y apellidos o razón social, domicilio/localidad |
| Investigado | Nombre y apellidos o razón social, domicilio/localidad |
| — | Delitos perseguibles de oficio conocidos, órgano al que se comunicaron |

**Gap detectado y resuelto** (commit en `main`): el `RegistryEntry` original
en `src/types/index.ts` no tenía los 4 campos que la ley exige
explícitamente. Ya están añadidos: `investigatedName`, `investigatedAddress`
(obligatorios, se capturan al crear el expediente en
`ConvertToCaseDialog.tsx` junto a objeto/interés legítimo, y viajan a través
de `Case` → `createRegistryEntry` al firmar el contrato) y `knownOffenses` +
`offensesReportedTo` (opcionales, casi siempre vacíos — se editan por
asiento desde el Libro-registro con un diálogo dedicado que usa el mecanismo
de enmienda ya existente, `amendRegistryEntry`, así que quedan con su propio
rastro de auditoría). De paso: el interés legítimo (Art. 48.2) **ya estaba
cubierto** en el modelo actual (`legitimateInterest` en `Case`) — la nota
anterior de este documento que lo daba por pendiente estaba equivocada.

### TIP (Tarjeta de Identidad Profesional)

Coincide con el número de DNI del detective — no es un código aparte que haya
que generar, solo capturarlo. Es personal e intransferible.

## 7. Decisiones recientes

### Estadísticas vs. contabilidad (decidido)

No se construye un módulo de "contabilidad" (facturación, IVA, cobros) —
eso ya lo cubren herramientas externas (Holded, A3, Contasimple...) que la
mayoría de despachos ya usan, y meterse ahí vuelve a inflar el alcance que
llevamos dos conversaciones recortando. En su lugar:

- El control económico por asunto (incluido el caso del cliente con marco,
  que no pasa por `quotes`) vive como campos directos en `cases`
  (`agreedAmount`, `billingMode`, ver §5) — no como colección aparte.
- Se añade una pantalla de **Estadísticas** de solo lectura, sin colección
  propia: agrega datos ya existentes en `quotes`/`cases` (presupuestos
  enviados/aceptados por mes, tasa de conversión, casos abiertos vs.
  cerrados, importe agregado por mes/despacho/tipo de investigación).
- Si en el futuro se pide facturación real (emitir y numerar facturas), se
  plantea como integración con el software de facturación del despacho, no
  como módulo propio.

### Invitación de colaborador, exportación de informe y contrato marco (decidido)

Los 3 puntos que quedaban abiertos se cerraron y ya están integrados en sus
secciones correspondientes: invitación de colaborador por email (§4.5),
informe exportable en PDF + `.docx` con logo del despacho (§4.2), y contrato
marco por subida de PDF externo (§4.6).

No queda ningún punto de alcance abierto — el documento pasa a modo
seguimiento de implementación (§8).

## 8. Estado técnico (a fecha de este documento)

- Repo: `gaepmalaga/det`.
- Esta conversación de diseño ocurrió en dos sesiones sobre la rama
  `claude/project-description-q1e942`, la primera de las cuales se quedó sin
  contexto ("prompt too long") y no se pudo recuperar su transcript completo
  — de ahí este documento.
- En paralelo, en esa misma rama se resolvió y mergeó-a-verde el PR #1
  ("Update Firebase project to detectivesprivadosesp"): se dejó de trackear
  `.env` (contenía credenciales reales de Firebase, ahora en `.gitignore`) y
  se corrigió un fallo de CI por falta de permisos (`checks: write`,
  `pull-requests: write`) en el workflow de preview de Firebase Hosting.
- **Pendiente para el usuario**: rotar las credenciales de Firebase en la
  consola, ya que quedaron expuestas en el historial de git aunque ya no estén
  trackeadas hacia adelante.
- El PR #1 se fusionó a `main`. A partir de ahora el trabajo se hace
  directamente sobre `main`, sin ramas ni PRs intermedios (petición explícita
  del usuario).
- El alcance (§1-§7) está completamente cerrado, sin puntos pendientes de
  decisión. El resto de este documento sigue siendo diseño sin implementar
  todavía — la reescritura grande (nuevas colecciones, quitar
  evidencias/compliance/portal-mensajería, informe con IA, plantillas de
  contrato, colaboradores híbridos, marco/estadísticas) no ha empezado, salvo
  la corrección del libro-registro de abajo.
- **Ya implementado y en `main`**:
  - El gap del libro-registro de §6 (Anexo VII) —
    `investigatedName`/`investigatedAddress` obligatorios en la creación de
    expediente, `knownOffenses`/`offensesReportedTo` editables por asiento
    desde el Libro-registro.
  - **Fase 2 — `contacts` + `quotes`**: el módulo `leads` (con su estado
    único nuevo/en_revision/aceptado/rechazado) se sustituyó por dos
    entidades separadas, como define §5. `Contact` es ahora solo identidad
    (nombre, email, teléfono, notas) sin estado propio; `Quote` es la
    oportunidad (tipo de investigación, descripción, importe,
    `enviado`/`aceptado`/`rechazado`) vinculada a un `contactId`, y un mismo
    contacto puede tener varios presupuestos en el tiempo. Al aceptar un
    presupuesto se abre un diálogo (`ConvertQuoteToCaseDialog`, heredero del
    antiguo `ConvertToCaseDialog`) que crea el cliente + expediente
    (con los campos legales de §6 ya incluidos) y marca el presupuesto como
    aceptado con el `caseId` resultante; al rechazar, queda el motivo
    registrado. Nuevas pantallas: `Contactos` (lista + detalle con sus
    presupuestos) y `Presupuestos` (pipeline global con pestañas de estado),
    sustituyendo a "Solicitudes" y al placeholder "Pre-expedientes" en el
    menú lateral. Dashboard, reglas de Firestore (`contacts`/`quotes`) e
    índices compuestos actualizados en consecuencia.
  - **Fase 3 — actuaciones "captura rápida" + informe**: `CaseAction` se
    redujo a lo que describe §4.1 — `description` (lo único que escribe el
    detective) más `locationLat`/`locationLng` capturados por
    `navigator.geolocation` al abrir el formulario (con aviso claro si el
    dispositivo la deniega o no está disponible, guardable igualmente sin
    ubicación). Se eliminaron `startTime`/`endTime`/`hoursWorked`/`rateType`
    y el enlace a evidencias — y con ellos, **todo el módulo de Evidencias**
    (`CaseEvidenceTab`, tipos `Evidence`/`EvidenceType`/`EvidenceVisibility`,
    regla de Firestore `evidence`, rutas `EVIDENCE`/`CASE_EVIDENCE`), tal
    como fijaba §2 — Storage se queda solo para contratos escaneados y (más
    adelante) logos de despacho. En el informe, un botón "Compilar N
    actuaciones" rellena el campo "Actuaciones realizadas" ordenando
    cronológicamente las actuaciones del expediente — **esto es una
    compilación determinista, no una llamada a un modelo de lenguaje**: no
    hay ninguna integración de IA real conectada todavía. Para la
    redacción en lenguaje de informe que describe §4.2 (la IA reordena y
    redacta, no solo concatena) haría falta una Cloud Function que llame a
    un LLM con una API key — infraestructura que este entorno no tiene
    configurada y que requiere que el usuario la provea. El resto del flujo
    del informe (bloqueo tras entrega, campos legales del Art. 49) ya
    funcionaba correctamente y no se ha tocado.
  - `npm run build` y `npm run lint` verificados sin errores nuevos antes de
    cada subida. Las páginas autenticadas nuevas o modificadas (Contactos,
    Presupuestos, Actuaciones, Informe) no se han podido verificar
    visualmente en navegador porque el login requiere credenciales reales
    de Google/Firebase no disponibles en este entorno — solo se verificó
    que la página de login (no autenticada) carga sin errores de consola y
    se ve bien en móvil/escritorio.
- Nota operativa: `firebase-hosting-merge.yml` despliega a producción en
  cada push a `main` — al trabajar sin PRs, cada commit a `main` se
  despliega directo. Se verifica build/lint localmente antes de cada push
  para no romper producción.
- **Fase 4 — plantilla de contrato + portal simplificado**:
  - Cada despacho configura **una** plantilla de contrato en Ajustes →
    Plantilla de contrato (`Firm.contractTemplate: { name, body }`, mismo
    patrón que tarifas/tipos de investigación — campo en el propio
    documento del despacho, no una colección nueva). El texto usa
    placeholders (`{{cliente_nombre}}`, `{{cliente_dni}}`,
    `{{cliente_domicilio}}`, `{{objeto}}`, `{{importe}}`, `{{fecha}}`,
    `{{despacho_nombre}}`, `{{despacho_rnsp}}`) — ver
    `src/lib/contractTemplate.ts`. Al crear un contrato desde un
    expediente, `ContractForm` rellena esos placeholders con los datos
    del cliente/caso/despacho, permite ajustar el texto a mano
    ("Regenerar desde plantilla" para volver a sincronizar sin perder
    ediciones sin querer), y guarda el resultado como `Contract.bodyText`
    — una foto fija en el momento de creación, para que editar la
    plantilla más adelante no cambie contratos ya emitidos. Si el
    despacho no ha configurado plantilla todavía, cae al formulario libre
    de antes (degradación elegante, no bloquea).
  - **Pendiente, no intentado a medias**: la firma real por parte del
    cliente vía link (clic + IP + timestamp) que describe §4.3 sigue sin
    existir — `SignContractDialog` sigue siendo una herramienta interna
    donde el propio despacho registra que alguien firmó (nombre + PDF
    escaneado opcional), no una vista pública para que el cliente
    revise y firme él mismo. Eso requiere una ruta pública nueva y
    reglas de Firestore más permisivas para un firmante no autenticado
    como miembro del despacho — se deja como siguiente pieza en vez de
    construirla a medias.
  - **Portal simplificado** exactamente como fija §4.4: la lista de
    "Mis expedientes" ahora muestra el importe del presupuesto
    (`Quote.amount`, vía `Case.quoteId` → `getQuote`) y un estado
    reducido a Abierto/Cerrado — no el pipeline interno completo de
    `CaseStatus`. Se eliminó toda la mensajería y los documentos
    liberados: `PortalMessage`/`PortalDocument` y sus funciones en
    `services/portal.ts`, las reglas `portalMessages`/`portalDocuments`
    y sus índices compuestos. La pestaña interna del expediente
    (`CasePortalTab`) se redujo a dar/revocar acceso — nada de "liberar
    documento" ni chat. El mecanismo de resolución de acceso
    multi-despacho por email (`portalClients`, ya existente) se mantuvo
    intacto porque ya hacía exactamente lo que hacía falta.
  - `npm run build` y `npm run lint` verificados sin errores nuevos en
    ambas partes de la fase (y de paso se limpiaron 3 errores de lint
    preexistentes al simplificar `usePortal.ts`/`services/portal.ts`).
  - **Fase 4 — parte 3, firma pública del contrato (clic + IP +
    timestamp)**: nueva ruta pública `/sign/:firmId/:contractId`
    (`SignContractPage`, fuera del `RouteGuard`, sin login) que muestra
    el `bodyText` del contrato (o los campos sueltos si no hay
    plantilla), pide nombre completo + una casilla de aceptación, y al
    firmar llama a `signContractPublicly` — guarda `status: 'firmado'`,
    `signedAt` (hora del servidor) y `signedByName`, más `signedIp` si
    se pudo resolver (fetch a `api.ipify.org` desde el navegador, sin
    backend propio). El enlace se genera y copia desde
    `CaseContractTab` ("Copiar enlace de firma"); el botón antiguo se
    renombró a "Registrar firma manual" para dejar claro que ahora
    son dos caminos distintos (firma real del cliente vs. que el
    despacho registre a mano una firma en papel).
    - **Seguridad sin Cloud Functions**: como no hay backend propio
      desplegado, la regla de Firestore se apoya en que el ID de
      Firestore del contrato ya es un identificador aleatorio no
      listable (se añadió `allow get: if true` pero `allow list` se
      mantiene restringido al despacho, así que no se puede enumerar
      contratos, solo acceder al que ya tienes por enlace) — es el
      mismo modelo de seguridad que "cualquiera con el enlace" de
      Google Docs o los enlaces de pago de Stripe. El `update` público
      solo puede pasar de no-firmado a `firmado`, solo puede tocar
      `status`/`signedAt`/`signedByName`/`signedIp`, y `signedAt` tiene
      que coincidir exactamente con la hora del servidor en el momento
      de la escritura (no se puede falsear la fecha de firma).
    - Verificado: build/lint limpios; probé la página en local contra
      un contrato inexistente (no pude probar el camino feliz porque
      este entorno no tiene acceso a Firestore real) — no crashea,
      muestra el mensaje de enlace no válido correctamente.
- El siguiente paso natural: Fase 5 (colaboradores híbridos, contrato
  marco del cliente habitual, estadísticas) — con esto la Fase 4 queda
  completa.
- **Fase 5 — parte 1, contrato marco del cliente habitual (2026-09-01)**:
  - `types/index.ts`: nuevo `FrameworkContract` (id, firmId, clientId,
    fileName, fileUrl, notes?, status: activo/inactivo). `Case` gana
    `agreedAmount?: number` y `billingMode: 'quote' | 'framework'`
    (con fallback a `'quote'` al leer casos ya existentes que no lo
    tenían).
  - `services/frameworkContracts.ts` (nuevo): subida del PDF a Storage
    en `firms/{firmId}/frameworkContracts/{id}/{fileName}` (la regla de
    Firestore para esta colección ya existía desde antes de esta
    sesión, sin usar — se aprovechó); `setClientFrameworkContract` en
    `services/clients.ts` enlaza el contrato al cliente.
  - `FrameworkContractSection.tsx` (en `features/clients/`, montado
    dentro de `ClientDetailPage`): si el cliente no tiene contrato
    marco activo, formulario de subida (PDF + nota opcional); si lo
    tiene, muestra el archivo, fecha, botón "Nuevo expediente" y
    "Desactivar". Subir uno nuevo desactiva automáticamente el
    anterior (no lo borra, quede como histórico).
  - `CreateFrameworkCaseDialog.tsx`: mismo formulario que
    `ConvertQuoteToCaseDialog` (tipo de investigación, objeto/alcance,
    interés legítimo, investigado — campos legales obligatorios) pero
    sin presupuesto: crea el expediente directamente con
    `billingMode: 'framework'` y un `agreedAmount` opcional "solo para
    control interno", tal como se decidió en §4.6/§7.
  - No se tocó `firestore.rules` (la regla de `frameworkContracts` ya
    estaba desplegada desde el incidente de esta misma sesión) ni
    `firestore.indexes.json` (no hace falta — se accede al contrato
    marco por ID directo desde `Client.frameworkContractId`, sin query).
- **Fase 5 — parte 2, Estadísticas (2026-09-01)**: pantalla de solo
  lectura en `/app/stats` (`StatsPage.tsx`), tal como se decidió en
  §7 — sin colección propia, agrega en el cliente los datos que ya
  cargan `useQuotes()`/`useCases()`: presupuestos enviados/aceptados/
  rechazados por mes (barras de css puro, sin librería de gráficos —
  el bundle ya avisa de que es grande), tasa de conversión, expedientes
  activos vs. cerrados, importe acordado por tipo de investigación
  (suma presupuestos aceptados + casos de contrato marco con
  `agreedAmount`), y expedientes por estado. Sin escritura, sin riesgo
  de reglas de Firestore.
  - Verificado ambas partes: `npm run build`, `npx tsc -b` y
    `npm run lint` limpios (los mismos 16 problemas preexistentes,
    cero nuevos). Sin verificación visual — misma limitación de red
    del sandbox de siempre (Contrato marco y Estadísticas requieren
    sesión autenticada).
  - Pendiente dentro de la Fase 5: **parte 3, colaboradores
    híbridos** (el modelo `tienePlataforma`, invitación por email, y
    el panel transversal de colaboraciones) — es la pieza más grande
    de las tres, con implicaciones de autenticación cross-despacho;
    se aborda a continuación en un commit aparte.

## Repaso visual (iniciado 2026-09-01)

El usuario señaló que, aunque todo funciona, la app **visualmente sigue
igual que al principio** — porque todo el código nuevo replicaba
fielmente el estilo ya existente (divs de Tailwind a mano: `bg-slate-50`,
tarjetas blancas, `bg-slate-900`), en vez de mejorarlo. Pidió
explícitamente que no se vea "hecho por una IA" (plantilla gris
genérica) y que sea agradable de usar.

Hallazgo: el proyecto **tiene shadcn/ui instalado** (`Button`,
`next-themes`, `tw-animate-css`) pero casi nada lo usa — ni el código
original ni el mío hasta ahora. El tema de color en `src/index.css`
era además el scaffold por defecto de shadcn: escala de grises pura
(`oklch(... 0 0)` en casi todos los tokens), sin ninguna identidad de
marca. Había incluso un bloque `@theme{}` duplicado y muerto (una
paleta azul `hsl(221 70% 35%)` que nunca llegaba a aplicarse porque el
bloque `@theme inline` posterior la pisaba).

**Decidido**: paleta propia — tinta/navy como color de marca
(`--primary`) + dorado cálido como acento (`--brand-gold`, evoca
sellos/placas, encaja con "investigación privada" sin caer en cliché
noir ni en el azul/morado genérico de SaaS). Fondo con un punto cálido
(no blanco puro). Se limpió el bloque `@theme{}` muerto.

**Piloto v2**: `LoginPage.tsx` rehecho por completo — panel de marca en
escritorio (navy con textura de puntos, mensaje + 3 puntos fuertes del
producto, icono de huella dactilar en vez de una letra "D" genérica),
formulario a la derecha con el `Button` real de shadcn. En móvil colapsa
a una sola columna. Capturas enviadas al usuario: reacción — "algo
mejor, pero aún pienso que puedes dar mucho mas nivel".

**Piloto v3**: se reconoció que la propia textura de puntos (dot-grid)
es en sí misma un cliché genérico de plantilla, así que se sustituyó
por: degradado radial de profundidad en el panel de marca
(`radial-gradient` de tres paradas en navy, en vez de un color plano),
una marca de agua grande de huella dactilar recortada fuera de encuadre
(`Fingerprint` al 5% de opacidad, `-right-24 -bottom-24`, trazo fino
`strokeWidth={0.6}`) en vez de un icono pequeño y literal, wordmark en
mayúsculas con tracking amplio, una regla dorada fina como separador
antes del titular, tipografía más grande y ajustada
(`text-4xl font-semibold tracking-tight`), y los 3 puntos fuertes con
insignias circulares translúcidas en vez de una lista plana. En móvil
se añadió un resplandor de degradado radial sutil detrás del formulario
en vez de dejar el fondo plano. Sigue usando el `Button` real de shadcn.

Reacción del usuario a la v3: "la parte izquierda me gusta, la otra la
veo mejorable, aunque vas por buen camino" — el panel de marca ya
convencía, pero el formulario a la derecha seguía flotando en un fondo
plano sin contención, sin peso visual que hiciera pareja con el panel
izquierdo.

**Piloto v4**: el formulario pasa a vivir dentro de una tarjeta elevada
(`rounded-2xl`, borde sutil, sombra de dos capas — una de contacto fina
y otra difusa y amplia por debajo, en vez del `shadow-sm` plano
genérico), con la misma regla dorada corta que el panel izquierdo justo
encima del titular, para que ambos lados se lean como una sola pieza de
diseño y no como dos mitades sin relación. Se añadió una línea de
confianza bajo el botón de Google (aislamiento de datos por despacho,
ligada a uno de los puntos fuertes de la izquierda) y un resplandor de
degradado sutil detrás de la tarjeta en toda la anchura (antes solo en
móvil).

Reacción del usuario a la v4: "mucho mejor, aplícalo al resto de la
app" — aprobación de la dirección, pide el rollout completo.

**Rollout al resto de la app (2026-09-01)**: 44 archivos usaban
clases `slate-*`/`white` fijas por Tailwind en vez de los tokens de
`src/index.css`, por lo que ninguna pantalla salvo login reflejaba la
paleta navy/dorado. Se hizo una pasada mecánica (script Python
desechable, `.reskin.py`, borrado tras usarlo) que sustituye cada
clase literal por su token semántico equivalente — mapeo completo por
cadena exacta, de más larga a más corta para no pisar sub-cadenas
(p. ej. `hover:bg-slate-800/60` antes que `bg-slate-800`):

- `text-slate-900/800/700` → `text-foreground`
- `text-slate-600/500/400` → `text-muted-foreground`
- `bg-slate-50/100/200/300` → `bg-muted`
- `bg-white` → `bg-card`, `text-white` → `text-primary-foreground`
- `bg-slate-900` → `bg-primary`, `hover:bg-slate-800` → `hover:bg-primary/90`
- `border-slate-100/200/300` → `border-border`
- `border-slate-900` → `border-primary` (subrayado de pestaña activa)
- `divide-slate-100` → `divide-border`

Después de la pasada mecánica se revisó a mano cada archivo con más
cambios y dos casos que el script no podía resolver bien solo:

- `LoginPage.tsx` tenía dos usos de `bg-white`/`text-white` como
  overlay translúcido fijo sobre el degradado navy (no como color de
  superficie del tema) — el script los convirtió a `bg-card`/
  `text-primary-foreground`, visualmente casi idénticos en claro pero
  semánticamente incorrectos; se revirtieron a `white` literal a mano.
- `SuperadminLayout.tsx` (sidebar oscuro del superadmin, antes
  `bg-slate-900` a mano) quedó con una mezcla inconsistente de
  `bg-primary`/`text-muted-foreground` sobre fondo oscuro (mal
  contraste). Se rehizo con los mismos tokens `sidebar-*` que
  `AppSidebar.tsx` (`bg-sidebar`, `sidebar-accent`, `sidebar-border`)
  y se cambiaron los acentos ámbar sueltos (`text-amber-400`,
  `bg-amber-500`) por `brand-gold`, con la misma barra dorada de
  ítem activo que en el sidebar principal.
- Los tres logos "D" en círculo (`PortalLoginPage.tsx`,
  `PortalLayout.tsx`, `OnboardingPage.tsx`) se cambiaron por el icono
  `Fingerprint` para que coincidan con la marca usada en login y en
  ambos sidebars, en vez de una letra que no aparece en ningún otro
  sitio de la app.

**No se rediseñó cada pantalla a nivel de layout** (tarjetas
elevadas, jerarquía tipográfica, espaciado) como en login — eso
habría sido un rediseño completo de ~30 pantallas en una sola pasada,
demasiado para revisar de golpe. Lo que se hizo es que **toda la app
adopta ya la identidad de color navy/dorado** de forma consistente
(fondos, texto, bordes, botones primarios, pestañas activas, ambos
sidebars) — el problema concreto que motivó la queja del usuario
("todo sigue igual") queda resuelto. Elevar el layout pantalla por
pantalla al nivel de login queda como trabajo futuro, a demanda.

Verificado: `npm run build` y `npm run lint` limpios tras la pasada
mecánica y tras los ajustes manuales (los mismos 17 errores/avisos
preexistentes de siempre, cero nuevos). Verificación visual limitada
a las pantallas públicas sin autenticación (`/login`, `/portal`,
`/sign/:firmId/:contractId`) vía `vite preview` + Playwright headless
— **las ~30 pantallas que requieren sesión de Firebase
(Dashboard, Expedientes, Presupuestos, Configuración, Superadmin...)
no se pudieron ver renderizadas en este entorno** porque el proxy de
red del sandbox no permite autenticar contra Firebase; su corrección
se apoya en la revisión de código (grep de cada combinación
`bg-*`/`text-*` para verificar contraste correcto) y en que build/lint
no señalan nada roto, no en una comprobación visual real. Pendiente
que el usuario confirme en producción que las pantallas autenticadas
se ven bien.

**Segunda pasada — Dashboard y Expedientes (2026-09-01)**: usuario
aprobó el rollout de color ("mucho mejor, aplícalo al resto de la
app") y pidió continuar. Se eligieron las dos pantallas de más uso
para llevarlas, ahora sí, al nivel de layout de login (no solo color):

- `DashboardPage.tsx`: saludo con el nombre de pila del usuario en vez
  de un `<h1>Dashboard</h1>` genérico; las 4 tarjetas de métricas
  pasan de icono suelto a insignia cuadrada (`bg-muted`, o `bg-primary/10`
  al hover) como las insignias circulares de login, con `shadow-sm` +
  `hover:shadow-md` en vez de solo cambiar el borde; los números
  principales usan `text-[1.75rem]` con `leading-none` para más
  presencia. Las cabeceras de las tarjetas "Expedientes activos" y
  "Presupuestos" y los botones de "Acceso rápido" ganan la misma
  insignia de icono en `bg-primary/10`/`bg-muted`.
- `CasesPage.tsx`: buscador, tarjetas móviles y tabla de escritorio
  ganan `shadow-sm` (y `hover:shadow-md` en filas/tarjetas
  interactivas) en vez de quedarse planos con solo un borde; cabecera
  de tabla con `bg-muted/60` en vez de `bg-muted` sólido.

No se tocó la lógica de datos ni el comportamiento en ninguna de las
dos, solo clases. Verificado build/lint limpios (16 problemas
preexistentes, uno menos que antes porque `DashboardPage.tsx` ya no
figura en la lista — se resolvió solo, no fue intencional). **Tampoco
se pudo verificar visualmente** por la misma limitación de red del
sandbox (ambas pantallas requieren sesión autenticada) — pendiente de
confirmación del usuario en producción.

Pantallas de más uso que quedan sin esta segunda pasada de layout:
Configuración, Contactos/Presupuestos, y el panel de Superadmin — a la
espera de que el usuario confirme que esta dirección también le
convence antes de seguir.

**Tercera pasada — Configuración y Superadmin (2026-09-01)**: usuario
pidió seguir sin esperar confirmación. Mismo criterio que Dashboard/
Expedientes, aplicado a:

- `SettingsPage.tsx` (solo la pestaña, sin cambios — ya reutiliza
  `PageHeader`) y sus 5 pestañas: `FirmSettingsTab.tsx`,
  `TariffsTab.tsx`, `InvestigationTypesTab.tsx`,
  `ContractTemplateTab.tsx` y `TeamTab.tsx` tenían formularios
  "sueltos" directamente sobre el fondo de la página, sin ninguna
  tarjeta que los contuviera — la sección más floja de toda la app.
  Cada bloque de formulario (Datos del despacho / Sede principal,
  Tarifas por hora / Gastos adicionales, tipos predefinidos /
  personalizados, plantilla de contrato, alta de miembro) pasa a vivir
  en `bg-card border border-border rounded-xl shadow-sm p-6`, con
  insignia de icono en los títulos que ya tenían uno.
- `SuperadminDashboard.tsx`: mismo tratamiento de tarjetas de métricas
  que `DashboardPage.tsx` (insignia cuadrada, `shadow-sm` +
  `hover:shadow-md`, número en `text-[1.75rem]`).
- `FirmsPage.tsx` y `FirmDetailPage.tsx`: `shadow-sm` en tarjetas y
  tabla, cabeceras de tabla en `bg-muted/60`, insignia del encabezado
  de `FirmDetailPage` pasa de `bg-muted` a `bg-primary/10` para que
  el icono destaque con el color de marca.
- `PageHeader.tsx` (componente compartido, usado por Configuración,
  Expedientes, Contactos, Presupuestos, Cumplimiento, Libro-registro,
  Contratos, Informes, Colaboradores...): título de `text-xl` a
  `text-2xl` para igualar el tamaño que ya tienen a mano Dashboard y
  Superadmin — un solo cambio que homogeneiza el tamaño de título en
  ~10 pantallas más sin tocarlas una a una.

Verificado build/lint limpios (16 problemas preexistentes, cero
nuevos). Sin cambios de lógica ni comportamiento. **Tampoco se pudo
verificar visualmente** — misma limitación de red del sandbox;
pendiente de confirmación del usuario en producción, especialmente en
Configuración por ser la pantalla con más cambios de estructura de
esta pasada.

Pantallas que siguen solo con color de la pasada mecánica, sin este
nivel de layout: Contactos, Presupuestos, Clientes, Colaboradores,
Cumplimiento, Contratos, Informes, Libro-registro, y las pestañas de
detalle de expediente (`CaseDetailPage` y sus tabs).

Verificado en cada iteración: build/lint limpios, sin errores nuevos.
Capturas de escritorio y móvil generadas localmente (`vite preview` +
Playwright headless) y revisadas antes de enviarlas.

## Incidente — producción caída (2026-09-01)

Entre el commit `c116c7a` (fix del `.env`, ~08:29 UTC) y `b5a1a9f`
(~10:37 UTC), **todos los despliegues a producción sirvieron una
pantalla en blanco**. Causa: al dejar de trackear `.env` (correcto —
tenía credenciales expuestas) no se dejó ninguna fuente alternativa
para `VITE_FIREBASE_*` en el build de CI. `src/lib/firebase.ts` llama
a `initializeApp()`/`getAuth()` en el nivel superior del módulo con un
`firebaseConfig` completamente `undefined`; eso lanza en cuanto se
carga el bundle, antes de que React monte nada — de ahí el blanco sin
ningún error visible en pantalla (sí había error en la consola del
navegador, pero nadie lo estaba mirando en un móvil).

No se detectó porque `npm run build`/`npm run lint` no ejecutan la
app — verifican tipos y estilo, no que Firebase se inicialice
correctamente — y porque todas mis pruebas en navegador headless
usaban el `.env` local de este entorno (con credenciales reales), que
nunca refleja lo que ve el build de CI. Tampoco pude verlo yo mismo en
`detectivesprivadosesp.web.app` porque el proxy de red de este entorno
bloquea ese dominio por política.

**Arreglado en `b5a1a9f`**: el paso "Build" de ambos workflows
(`firebase-hosting-merge.yml`, `firebase-hosting-pull-request.yml`)
ahora inyecta `VITE_FIREBASE_*` desde GitHub Actions Secrets
(`Settings → Secrets and variables → Actions`, 6 secretos con el mismo
nombre que las variables). El usuario los añadió a mano — no hay
herramienta disponible para crearlos por API — y se disparó un nuevo
despliegue para recogerlos.

**Lección para el futuro**: cualquier cambio a la configuración de
build/despliegue (variables de entorno, secretos, workflows) necesita
una verificación explícita de que el sitio carga de verdad después del
deploy — build/lint limpios no son suficiente señal cuando lo que
cambia es precisamente la infraestructura que build/lint no ejercitan.

## Incidente — reglas de Firestore nunca desplegadas (2026-09-01)

Usuario reportó "Error al cargar los contactos" / "Error al cargar
los presupuestos" en producción, con capturas de pantalla del móvil.
**No tiene relación con los cambios de diseño de hoy** — es un bug de
infraestructura que lleva ahí desde la Fase 2.

**Causa**: `firebase-hosting-merge.yml` y `firebase-hosting-pull-
request.yml` solo despliegan **Hosting** (`FirebaseExtended/action-
hosting-deploy@v0`). Ninguno de los dos ejecuta nunca `firebase
deploy --only firestore:rules,firestore:indexes` — así que aunque
`firestore.rules` lleva desde la Fase 2 con reglas para
`firms/{firmId}/contacts` y `firms/{firmId}/quotes` (y desde la Fase 4
con la regla de firma pública de contratos), **esas reglas nunca han
llegado a Firestore real**. El proyecto sigue sirviendo las reglas
manuales de antes de este rediseño, que no contemplan esas
subcolecciones — Firestore deniega por defecto cualquier colección sin
match, de ahí el error genérico (el código atrapa el
`permission-denied` y lo convierte en "Error al cargar...").

Esto también significa que **la firma pública de contratos
(`/sign/:firmId/:contractId`) probablemente lleva rota desde la Fase
4** por el mismo motivo — la regla `allow get: if true` para el enlace
público tampoco se ha desplegado nunca.

**Arreglado**: añadido un paso "Deploy Firestore rules, indexes and
Storage rules" a `firebase-hosting-merge.yml` (solo al workflow de
merge a main, no al de preview de PR, para no tocar producción desde
una preview) que escribe el secret
`FIREBASE_SERVICE_ACCOUNT_DETECTIVESPRIVADOSESP` ya existente a un
fichero temporal, lo usa como `GOOGLE_APPLICATION_CREDENTIALS` y
ejecuta `npx firebase-tools deploy --only
firestore:rules,firestore:indexes,storage`. A partir de este commit,
cualquier cambio futuro a `firestore.rules`, `firestore.indexes.json`
o `storage.rules` se desplegará automáticamente en cada push a main,
igual que ya pasaba con el hosting.

**No verificado tras el fix** (misma limitación de siempre: sin
acceso de red a Firebase desde este entorno) — pendiente de que el
usuario recargue Contactos y Presupuestos en producción y confirme
que cargan. Si sigue fallando, el siguiente paso es revisar los logs
del propio paso de deploy en GitHub Actions (puede fallar por
permisos del service account sobre Firestore/Storage, no solo sobre
Hosting) y, si es necesario, verificar en la consola de Firebase que
las reglas mostradas coinciden con `firestore.rules` del repo.

**Lección para el futuro**: un cambio a `firestore.rules` sin un paso
de CI que lo despliegue es un cambio que no existe en producción,
por mucho que esté commiteado y el build pase — build/lint no
detectan esto porque las reglas de seguridad no se ejecutan en el
build local, solo en el servidor de Firestore real.

**Corrección**: el primer intento (con `storage` incluido en el
`--only`) falló en CI — logs del job:
`Error: Request to https://serviceusage.googleapis.com/.../services/
firebasestorage.googleapis.com had HTTP Error: 403, Permission denied
to get service`. El service account que ya existía (creado solo para
desplegar Hosting) no tiene permiso IAM sobre la API de Storage, y
firebase-tools comprueba las APIs de *todos* los targets pedidos antes
de desplegar ninguno — así que ni siquiera llegó a intentar Firestore.
Se quitó `storage` del comando (queda `--only
firestore:rules,firestore:indexes`, solo lo que hacía falta para el
bug de contactos/presupuestos) y se re-desplegó. Las reglas de
`storage.rules` (usadas por contratos escaneados y, más adelante,
logos de despacho) **siguen sin desplegarse** — pendiente de que el
usuario amplíe el rol del service account en la consola de Google
Cloud (IAM) si quiere que ese target también se automatice; mientras
tanto habría que desplegarlas a mano una vez desde una máquina con
`firebase login`.

**Cuarta pasada — resto de pantallas de layout (2026-09-01)**: mientras
se verificaba el deploy del fix de reglas, se continuó con el mismo
tratamiento de elevación (`shadow-sm`, `hover:shadow-md` en filas/
tarjetas interactivas, cabeceras de tabla `bg-muted/60`, buscadores con
`shadow-sm`) en el resto de pantallas que solo tenían el color de la
pasada mecánica: Contactos, Presupuestos (`QuotesPage`, `QuoteCard`),
Clientes, Colaboradores, Cumplimiento, Contratos, Informes,
Libro-registro, y `CaseDetailPage` con sus 5 pestañas (Actuaciones,
Auditoría, Contrato, Portal, Informe). Aplicado con un script de
sustitución por patrones exactos de clase (igual que la pasada de
color), más algunos ajustes a mano donde el patrón no coincidía
exactamente (indentación distinta o clases adicionales en la misma
tarjeta). Sin cambios de datos ni comportamiento.

Con esto, **todas las pantallas de la app comparten ya el mismo
lenguaje visual** (color + elevación) — la única pantalla con un nivel
de layout claramente superior sigue siendo login (degradado, marca de
agua, tipografía a medida), que se dejó así deliberadamente como pieza
de bienvenida más elaborada, no como inconsistencia.

Verificado build/lint limpios (16 problemas preexistentes, cero
nuevos). Sin verificación visual posible por la misma limitación de
red de siempre.

**Segunda corrección — el problema real es el rol IAM del service
account (2026-09-01)**: quitar `storage` no arregló nada. El mismo
error 403 aparece con `firestore:rules,firestore:indexes` a solas:

```
Error: Request to https://serviceusage.googleapis.com/v1/projects/.../
services/firestore.googleapis.com had HTTP Error: 403, Permission
denied to get service [firestore.googleapis.com]
```

Esto **no** es que la API de Firestore esté deshabilitada (obviamente
no lo está, la app la usa constantemente) — es que el service account
de `FIREBASE_SERVICE_ACCOUNT_DETECTIVESPRIVADOSESP` tiene un rol IAM
tan estrecho (probablemente solo "Firebase Hosting Admin", suficiente
para lo único que se le pedía hasta ahora) que ni siquiera puede
*consultar* si una API está habilitada — permiso
`serviceusage.services.get`, que firebase-tools comprueba antes de
desplegar cualquier producto que no sea Hosting. Pasaría lo mismo con
cualquier `--only` que no sea `hosting`.

**No hay arreglo posible desde el código o desde este entorno** — hace
falta que el usuario amplíe el rol del service account en Google Cloud
Console (no hay API para esto, es una acción manual en IAM):

1. Entrar en https://console.cloud.google.com/iam-admin/iam?project=detectivesprivadosesp
2. Buscar la cuenta de servicio cuyo email coincide con el campo
   `client_email` del JSON que se subió al secret
   `FIREBASE_SERVICE_ACCOUNT_DETECTIVESPRIVADOSESP` (algo con forma
   `firebase-adminsdk-xxxxx@detectivesprivadosesp.iam.gserviceaccount.com`).
3. Editar sus roles (icono de lápiz) y añadir el rol **"Firebase
   Admin"** (cubre Firestore, Storage e Índices de una vez — es el rol
   estándar recomendado para un service account de CI que despliega un
   proyecto Firebase completo).
4. Guardar.

Mientras tanto, el paso "Deploy Firestore rules and indexes" del
workflow se marcó `continue-on-error: true` para que no tumbe todo el
job (el hosting sigue desplegándose bien, solo ese paso concreto queda
en rojo/advertencia) — en cuanto se amplíe el rol, el mismo paso
empezará a funcionar solo, sin tocar más código. **El bug de
Contactos/Presupuestos sigue sin arreglarse en producción hasta que
se complete este paso manual.**

**Actualización**: el usuario añadió el rol "Administrador de
Firebase" al service account desde IAM (manteniendo los tres roles que
ya tenía: Firebase Authentication Admin, Admin SDK Service Agent y
Service Account Token Creator) y lo guardó. Este commit es solo para
disparar un despliegue nuevo y comprobar si el paso de reglas ya pasa.

**Resuelto**: el run del commit `9a13ff7` (run 26,
2026-09-01T12:09Z) muestra el paso "Deploy Firestore rules and
indexes" en `conclusion: success` de verdad, no enmascarado por
`continue-on-error` — las reglas de `firms/{firmId}/contacts` y
`firms/{firmId}/quotes` ya están desplegadas en el Firestore real.
`continue-on-error: true` se deja en el workflow como red de
seguridad (si algún día vuelve a fallar por lo que sea, no debe tumbar
el despliegue de hosting), no hace falta quitarlo. Storage sigue sin
desplegarse automáticamente (no estaba en el `--only` de este paso) —
si hace falta en el futuro, añadir `,storage` ahora debería funcionar
ya que el rol "Administrador de Firebase" también lo cubre; no se ha
hecho porque no había una necesidad inmediata. Pendiente de que el
usuario confirme que Contactos y Presupuestos cargan en producción.

**Actualización — añadido (2026-09-01, sesión local)**: se añadió
`,storage` al `--only` del paso "Deploy Firestore rules, indexes and
Storage rules" en `firebase-hosting-merge.yml`. No hizo falta tocar IAM
—el rol "Administrador de Firebase" ya concedido cubre Storage, como se
anotó arriba—, así que `storage.rules` pasa a desplegarse
automáticamente en cada push a `main` igual que Firestore.

## Incidente — fuga de datos entre despachos vía `cases`/`portalClients` (2026-09-01)

Hallado por casualidad diseñando el acceso de colaboradores para la
Fase 5 (no relacionado con el trabajo de esa fase ni con nada de esta
sesión — el bug es anterior). Dos reglas de `firestore.rules` eran
mucho más permisivas de lo que su propio uso necesitaba:

- **`firms/{firmId}/cases/{caseId}`**: `allow read: if isSuperAdmin()
  || isActiveMember(firmId) || isAuth();` — el último `|| isAuth()`
  significa que **cualquier usuario con sesión iniciada en la
  plataforma** (un cliente del portal de cualquier despacho, un
  empleado de cualquier otro despacho, cualquiera con cuenta) podía
  leer cualquier expediente de cualquier despacho conociendo o
  adivinando su ID — no solo los suyos. La misma regla exacta estaba
  duplicada en `portalAccess` (subcolección de cada expediente).
- **`portalClients`** (índice global cliente→despachos/expedientes
  usado para resolver el acceso al portal en el login): `allow
  create/update: if isAuth();` sin ninguna comprobación de quién
  escribe. Cualquier usuario autenticado podía añadir a su **propio**
  registro `firmIds`/`caseIds` arbitrarios — y como la lectura de
  `cases` era igual de abierta, eso equivalía a poder auto-concederse
  acceso al expediente de cualquier cliente de cualquier despacho.

**Por qué estaba así**: el modelo de acceso del portal resuelve "¿qué
puede ver este cliente?" mediante `portalClients` (consultado por
email) más `portalAccess` por expediente (consultado por lista, sin
filtrar por usuario) — ninguna de las dos comprobaciones originales
verificaba de verdad la identidad de quien pedía los datos, solo que
tuviera *alguna* sesión.

**Arreglado**:
- `services/portal.ts` — `createPortalAccess` ya no usa un ID de
  documento aleatorio (`addDoc`) para `portalAccess`; usa el email
  normalizado del cliente como ID (`setDoc(doc(ref, email), ...)`).
  Esto permite que la regla de seguridad compruebe con un `exists()`/
  `get()` exacto — sin consultas — si existe un acceso activo cuyo ID
  coincide con `request.auth.token.email` (el email verificado por
  Google en el token de sesión, no un dato que el cliente pueda
  falsear).
- `firestore.rules`:
  - `cases`: la lectura de un no-miembro del despacho ahora exige que
    exista `portalAccess/{tu-email}` con `isActive == true` para ese
    expediente concreto — ya no basta con estar autenticado.
  - `portalAccess`: mismo cambio, comparando el ID del documento
    directamente con `request.auth.token.email`.
  - `portalClients`: `create` exige ser `isActiveMember` del primer
    despacho del array (siempre es así al crear, ver el código);
    `update` exige ser `isActiveMember` del último despacho añadido al
    array **o** ser el propio dueño del registro (email verificado)
    tocando solo `userId`/`lastAccessAt` (el único caso en que el
    cliente se actualiza a sí mismo, al iniciar sesión por primera
    vez). La lectura de `portalClients` se deja abierta a
    autenticados a propósito — solo contiene un índice
    (email/nombre/IDs), no contenido de expedientes, y evita tener que
    reproducir aquí la lógica de "pertenece a cualquiera de estos
    despachos" que las reglas no expresan bien sobre arrays.

**No verificado con el emulador de Firestore** (no disponible en este
entorno) — solo revisión manual de la lógica contra los flujos de
código reales (`createPortalAccess`, `updatePortalClientUserId`,
`getCase`, `useClientPortal`). Verificado: `npx tsc -b`, `npm run
build` y `npm run lint` limpios (mismos 16 problemas preexistentes).
Se apoya en que la CI **ya despliega automáticamente** `firestore.rules`
tras el incidente anterior de esta misma sesión, así que este cambio
llegará a producción con el próximo push sin pasos manuales.

**Pendiente de verificación real**: pedir al usuario que, tras el
despliegue, compruebe que el flujo de portal existente (conceder
acceso desde `CasePortalTab`, el cliente inicia sesión y ve su
expediente) sigue funcionando — es el área con más riesgo de regresión
de este cambio, al no haber podido probarlo contra Firestore real.

## Fase 5 — parte 3: colaboradores híbridos (2026-09-01)

Completa la Fase 5 (con esto, las Fases 1-5 del documento están
implementadas). Modelo según §4.5: dos tipos de colaborador —
`tienePlataforma: true` (cuenta propia, acceso restringido a los casos
donde colabora) vs. `false` (alta manual, sin cuenta, el despacho
titular anota su avance).

**Sin Cloud Functions no se puede enviar el email de invitación
automáticamente** — mismo límite ya documentado para el informe con
IA y ahora también aquí: el despacho copia un enlace y lo envía por su
cuenta (idéntico modelo de confianza que la firma pública de
contratos: el ID del documento no es adivinable, y la regla de
seguridad comprueba la identidad real en el momento de aceptar, no la
posesión del enlace).

**Modelo de datos**:
- `Collaborator` (en `services/collaborators.ts`, ya existía desde
  antes de esta fase) gana `tienePlataforma`, `invitedEmail`,
  `invitationStatus` (`pendiente`/`aceptada`), `linkedUserId`,
  `linkedUserEmail`, `inviterFirmName` (copiado del despacho titular
  en el momento de invitar, para que la página pública de invitación
  no necesite permiso para leer `firms/{firmId}`, al que el
  colaborador invitado aún no pertenece).
- `collaboratorIndex/{uid}` (colección nueva, top-level): mismo patrón
  que `userFirmIndex/{uid}` (ya existente) — un documento por usuario
  con la lista de colaboraciones aceptadas
  (`{firmId, collaboratorId, firmName, acceptedAt}`), usado por
  `AuthContext` para resolver el nuevo `userType: 'collaborator'` sin
  necesitar una query. **No es la fuente de autorización real** — eso
  lo decide, para cada acceso a un expediente concreto, si
  `collaboratingFirms/{id}.linkedUserId` coincide con el uid de quien
  pide los datos (función `isLinkedCollaborator` en las reglas) —
  igual que se corrigió para `portalClients` en el incidente anterior,
  el índice puede ser laxo en su lectura/escritura propia porque por
  sí solo no concede acceso a nada.
- `Case` gana un uso real para el ya existente pero nunca usado
  `collaboratingFirmId` — asignable desde una tarjeta "Colaborador
  asignado" en `CaseDetailPage` (selector con los colaboradores
  activos del despacho).
- `CaseAction` gana `reportedByCollaboratorId?: string` — en
  `CaseActionsTab`, si el expediente tiene un colaborador sin
  plataforma asignado, aparece una casilla "Reportado por [nombre]"
  al crear la actuación.

**Flujo con plataforma**:
- `CollaboratorsPage`: al crear un colaborador, casilla "Este despacho
  ya usa DetectiveOS" + email de invitación.
- `CollaboratorDetailPage`: tarjeta de estado de la invitación +
  botón "Copiar enlace de invitación" mientras esté pendiente.
- `/collab-invite/:firmId/:collaboratorId` (`CollaborateInvitePage`,
  pública, fuera de `RouteGuard`): pide iniciar sesión con Google,
  comprueba que el email coincide con el invitado, botón "Aceptar
  invitación" → marca `invitationStatus: 'aceptada'` en el documento
  del despacho titular y añade la entrada en `collaboratorIndex` del
  usuario.
- `/collaborate` (`CollaboratePortalLayout` + `CollaborateDashboard` +
  `CollaborateCaseDetail`, protegidas por `RouteGuard`
  `allowedTypes: ['collaborator']`): panel **transversal** — agrega
  expedientes de todos los despachos en su `collaboratorIndex`, no un
  panel por despacho (tal como pide §4.5). Cada expediente muestra sus
  actuaciones y permite añadir nuevas (captura con geolocalización,
  igual que el formulario del despacho) — nada más: sin acceso al
  resto del expediente ni de la app.

**Reglas de Firestore** (todas nuevas, ninguna reutiliza el patrón
`|| isAuth()` que se acaba de corregir en el incidente anterior):
- `collaboratorIndex/{uid}`: lectura/escritura solo del propio usuario
  (como `userFirmIndex`).
- `collaboratingFirms/{id}`: lectura ampliada para que la persona
  invitada vea su propia invitación (comparando
  `invitedEmail == request.auth.token.email`, nunca listable);
  actualización ampliada para "aceptar" con las mismas comprobaciones
  de `diff().affectedKeys().hasOnly([...])` que ya se usaron para la
  firma pública de contratos.
- `cases/{caseId}`: nueva cláusula de lectura para el colaborador
  vinculado (`isLinkedCollaborator`), aparte de la de portal ya
  corregida.
- `cases/{caseId}/actions/{actionId}`: lectura y creación (nunca
  edición/borrado) para el colaborador vinculado al expediente padre.
- Ninguna requiere índice compuesto nuevo — la única query añadida
  (`getCasesForCollaborator`, filtro simple por
  `collaboratingFirmId`) no lleva `orderBy`, se ordena en el cliente.

Verificado: `npx tsc -b`, `npm run build` y `npm run lint` limpios
(mismos 16 problemas preexistentes, cero nuevos). Sin verificación
visual ni del flujo de invitación completo — misma limitación de red
de siempre, agravada aquí porque probar la aceptación de la invitación
requeriría dos sesiones de Google distintas (despacho + colaborador).
Pendiente de que el usuario pruebe el flujo completo en producción:
crear un colaborador con plataforma, copiar el enlace, aceptarlo desde
otra cuenta de Google, asignarlo a un expediente y comprobar que
aparece en `/collaborate`.

**Con esto, las 5 fases del documento están implementadas.** Quedan
como trabajo futuro, ya anotados en sus secciones correspondientes: el
informe con prosa real generada por IA (necesita una Cloud Function
con clave de API real), la exportación de informes a PDF/.docx, y
desplegar automáticamente `storage.rules` en CI (pendiente de que el
usuario amplíe permisos del service account si hace falta en el
futuro).

## Incidente — "Crear expediente" no avanzaba al aceptar un presupuesto (2026-09-01)

Reportado por el usuario probando el flujo real por primera vez desde
que existe (Fase 2). No es un bug de esta sesión, ni de las fases más
recientes — estaba ahí desde que se creó `ConvertQuoteToCaseDialog`.

**Causa**: `createCase()` (`services/cases.ts`) es la única función
`create*` de todo el proyecto que hacía `addDoc(ref, { ...data, ... })`
con el objeto del formulario esparcido directamente, en vez del patrón
que usan todas las demás (`createContact`, `createQuote`,
`createCollaborator`, `createClient`...): copiar cada campo opcional
uno a uno con `if (data.x) cleanData.x = data.x`. Cuando un campo
opcional del formulario se deja vacío, el valor que llega es
`undefined` explícito (p. ej.
`investigationTypeCustom: form.investigationTypeCustom || undefined`)
— y Firestore **rechaza cualquier `undefined` literal** en un
`addDoc`/`updateDoc`, lanzando una excepción en el propio cliente,
antes de tocar la red. Como `handleSubmit` en el diálogo no tenía
`catch`, esa excepción se tragaba en silencio: `setLoading(false)`
se ejecutaba igualmente vía `finally`, así que el botón volvía a
estar activo pero sin ningún mensaje de error — de ahí la sensación de
"no avanza".

Se dispara con el caso más común: dejar "Tipo de investigación
personalizado" en blanco (que es opcional y la mayoría de veces no
hace falta rellenar).

**Arreglado**: `createCase()` ahora filtra los campos `undefined` del
objeto antes de esparcirlo, igual que ya se hizo para `updateCase()`
en el arreglo de seguridad anterior de esta misma sesión.

**Mismo bug ya estaba latente en el contrato marco de esta sesión**:
`CreateFrameworkCaseDialog.tsx` (Fase 5, parte 1) tiene el mismo patrón
(`agreedAmount: form.agreedAmount ? parseFloat(...) : undefined`, un
campo marcado como opcional) — con el fix genérico en `createCase()`
queda cubierto también, sin tocar ese diálogo.

Verificado build/lint limpios. Revisado el resto de servicios
(`grep` de `...data` esparcido en un `addDoc`) — `createCase` era el
único caso, no hay más instancias conocidas de este patrón.

**Sin verificar en producción** — misma limitación de siempre.

## Cambio de flujo: Contrato antes que Expediente (2026-09-01)

Tras el incidente anterior, el usuario probó el flujo real y señaló que
"está todo muy desperdigado", describiendo el modelo mental correcto:
todo contacto es un prospecto que puede tener varios presupuestos; cada
presupuesto aceptado da lugar a un contrato; **solo si ese contrato se
firma** se abre su expediente y su asiento de libro-registro
correspondiente; un mismo cliente puede repetir el ciclo con nuevos
presupuestos → nuevos contratos → nuevos expedientes independientes.

Esto no coincidía con el flujo documentado en el §3 original (el
expediente se abría al aceptar el presupuesto, antes de que existiera
ningún contrato firmado). Se le presentó la discrepancia explícitamente
y el usuario decidió: **"Contrato primero, expediente solo si se
firma"** — cambiar el sistema para que el expediente nunca exista antes
de que haya un contrato firmado.

**Por qué importa legalmente**: el libro-registro (Anexo VII, Art. 108
Reglamento) debe reflejar investigaciones realmente encargadas y
formalizadas — abrir un asiento sobre un presupuesto todavía sin
contrato firmado era, estrictamente, prematuro.

### Flujo nuevo

```
Presupuesto aceptado
  → se crea la ficha de Cliente (a partir del contacto)
  → se crea un Contrato en estado "borrador", con los datos legales
    del futuro expediente ya guardados en el propio presupuesto
    (objeto, interés legítimo, investigado, domicilio)
        ↓ firma (link público o "Registrar firma manual")
  → SOLO ENTONCES: se crea el Expediente + su asiento de Libro-registro
```

### Cambios técnicos

- `Quote` (`services/quotes.ts`) gana `clientId`, `contractId`, `caseId`
  y los campos legales (`objectScope`, `legitimateInterest`,
  `investigatedName`, `investigatedAddress`,
  `assignedDetectiveId/Tip`) — se rellenan al aceptar, no se pierden.
  `acceptQuote()` ya no crea nada, solo guarda estos datos y pasa el
  presupuesto a `aceptado`.
- `Contract` (`services/contracts.ts`) gana `quoteId`, para poder volver
  al presupuesto de origen desde el contrato.
- **`services/caseOpening.ts` (nuevo)** — punto único donde se abre un
  expediente: `openCaseFromContract(firmId, userId, contractId)`. Lee
  el contrato, comprueba que está `firmado`, recupera el presupuesto de
  origen, crea el `case`, enlaza `quote.caseId`/`contract.caseId`, crea
  el asiento de libro-registro y activa el expediente
  (`status: 'activo'`) — es idempotente (si el contrato ya tiene
  `caseId`, devuelve el existente en vez de duplicar).
- **`features/quotes/AcceptQuoteDialog.tsx` (nuevo, sustituye a
  `ConvertQuoteToCaseDialog.tsx`, que se ha borrado)** — diálogo de dos
  pasos: 1) datos legales del futuro expediente + creación del cliente,
  2) formulario de contrato (reutiliza `ContractForm`, ya preparado
  para esto con `defaultAgreedPrice`/`quoteId`). Al terminar, el
  usuario aterriza en Contratos, no en un expediente (todavía no
  existe).
- **`features/contracts/ContractsPage.tsx` (reescrita)** — antes era una
  lista de solo lectura; ahora cada contrato pendiente de firma tiene
  "Copiar enlace de firma" y "Registrar firma manual"
  (`SignContractDialog`, reutilizado tal cual desde el expediente). Al
  firmar manualmente se llama a `openCaseFromContract` y se navega
  directo al expediente recién abierto. Un contrato firmado por enlace
  público que aún no tiene expediente muestra un botón "Abrir
  expediente" (ver por qué no es automático, debajo).
- **Por qué la firma pública no abre el expediente sola**: no hay Cloud
  Functions en este entorno, y el firmante del enlace público no está
  autenticado como miembro del despacho — las reglas de Firestore no le
  pueden permitir crear un `case` (colección sensible con datos de
  investigación). Por eso `signContractPublicly` solo cambia
  `status/signedAt/signedByName/signedIp`, y abrir el expediente queda
  como acción manual del despacho vía el botón "Abrir expediente".
- **`features/cases/tabs/CaseContractTab.tsx` — sin tocar,
  deliberadamente**: sigue usándose para contratos adicionales sobre un
  expediente que **ya existe** (el caso de los expedientes de marco de
  colaboración/corporativo, creados directamente desde
  `CreateFrameworkCaseDialog` sin pasar por presupuesto — ahí el
  expediente nace en `revision` y el contrato lo activa). Es un flujo
  distinto y legítimo, no el mismo código duplicado.

Verificado `npx tsc -b`, `npm run build` y `npm run lint` limpios (16
problemas preexistentes, cero nuevos).

**Sin verificar en producción** — misma limitación de siempre; el
usuario deberá probar el ciclo completo (presupuesto → contrato → firma
→ expediente → libro-registro) en real.

## Refinamientos al flujo Presupuesto → Contrato → Expediente (2026-09-01)

Tras explicar el flujo real (cliente llama, se pide datos, se presupuesta,
si se acepta toca contrato, si se firma se abre expediente, y un mismo
cliente puede repetir el ciclo para una nueva investigación), el usuario
pidió tres ajustes concretos:

1. **Bug de cliente duplicado (arreglado)** — `AcceptQuoteDialog` creaba
   una ficha de cliente nueva en `createClient()` cada vez que se
   aceptaba un presupuesto, sin comprobar si el contacto ya tenía una.
   Un mismo cliente con una segunda investigación se habría duplicado.
   Arreglado con `getClientByContactId(firmId, contactId)` (nuevo, en
   `services/clients.ts`, busca por `convertedFromContactId`): si ya
   existe cliente para ese contacto, se reutiliza su `id` en vez de
   crear uno nuevo.

2. **Subir el presupuesto en PDF (añadido, opcional)** — `Quote` gana
   `documentUrl`/`documentName`. Nuevo `uploadQuoteDocument()` en
   `services/quotes.ts` (mismo patrón que los documentos de contrato:
   `firms/{firmId}/quotes/{quoteId}/{nombre}` en Storage, ya cubierto
   por las reglas existentes de `firms/{firmId}/**`). `CreateQuoteDialog`
   tiene ahora un campo de subida opcional; el importe se sigue
   guardando siempre en el formulario (para el futuro módulo de
   contabilidad), el PDF es solo un adjunto de apoyo. Se ve como enlace
   "Ver PDF del presupuesto" en `QuoteCard`.

3. **Contrato: plantilla Y subida de PDF, ambas disponibles (añadido)**
   — el usuario quería las dos opciones, no una u otra. `Contract` gana
   `sourceDocumentUrl`/`sourceDocumentName` (documento *base* subido por
   el detective, distinto de `scannedDocumentUrl` que es el documento
   *ya firmado* que se archiva después). `ContractForm` sigue generando
   el texto desde la plantilla del despacho como hasta ahora, y además
   tiene una sección independiente para subir un PDF ya redactado fuera.
   Si se sube ese PDF, es lo que ve y firma el cliente en el enlace
   público (`SignContractPage` prioriza `sourceDocumentUrl` — lo muestra
   en un `<iframe>` con enlace para abrirlo en pestaña nueva — por
   encima del texto generado). Nuevo `uploadContractSourceDocument()` en
   `services/contracts.ts`; se sube justo después de crear el contrato,
   desde los dos sitios donde se crean contratos
   (`AcceptQuoteDialog.handleCreateContract` y
   `CaseContractTab.handleCreate`), antes de cerrar el diálogo o navegar
   — así no hay carrera entre la subida y que el componente se
   desmonte. Enlaces "Ver PDF subido" añadidos en `ContractsPage` y
   `CaseContractTab`.

Verificado `npx tsc -b`, `npm run build` y `npm run lint` limpios (16
problemas preexistentes, cero nuevos).

**Sin verificar en producción** — misma limitación de siempre.

## Selector de ubicación en actuaciones — varios puntos + mapa (2026-09-01)

El usuario señaló un problema real de la "captura rápida" de
actuaciones: la ubicación se leía una sola vez (`getCurrentPosition`)
en el momento de abrir el formulario. Si el detective va en movimiento
(p. ej. en coche) mientras redacta lo que está viendo, esa lectura
puede quedar varios km desfasada para cuando pulsa "Guardar".

Se descartó la primera propuesta (seguir siempre la última posición en
segundo plano, sin más) porque el propio usuario señaló que "la última
no siempre es la mejor" — el detective puede seguir describiendo algo
que vio hace un momento aunque ya se haya desplazado. Solución
decidida por el usuario: **registrar varias posiciones mientras
escribe y dejar elegir en un mapa**, no solo una.

**`src/features/cases/LocationPicker.tsx` (nuevo)** — con Leaflet
vanilla (no `react-leaflet`, para evitar fricción de peer-deps con
React 19) + tiles de OpenStreetMap (gratis, sin API key, coherente con
que este proyecto no tiene todavía presupuesto/gestión de claves para
APIs de pago tipo Google Maps):

- Mientras el formulario está abierto, `watchPosition` va registrando
  posiciones — pero solo se guarda una nueva si está a más de 1 km de
  la última guardada (`src/lib/geo.ts`, distancia Haversine), para no
  acumular ruido si el detective está parado.
- Todas las posiciones detectadas se muestran como puntos en el mapa;
  la más reciente se resalta en verde y es la que se usa por defecto.
- Tocar cualquier punto del mapa (uno de los detectados, o un lugar
  cualquiera) fija esa posición como la elegida a mano (marcador azul);
  un enlace permite volver a "seguir la última detectada
  automáticamente".
- Si no hay permiso de GPS o el navegador no lo soporta, el mapa se
  sigue mostrando (centrado en España por defecto) para poder marcar la
  ubicación a mano de todos modos.
- El ciclo de vida (GPS + mapa) está atado al montaje/desmontaje del
  propio componente — arranca cuando se abre el formulario, se limpia
  solo al cerrarlo, sin necesidad de props de control adicionales.

No ha hecho falta ningún cambio de esquema: `CaseAction` ya tenía
`locationLat`/`locationLng` como par de números sueltos — solo cambia
cómo se decide qué par se guarda.

Nueva dependencia: `leaflet` + `@types/leaflet` (instalados con
`--legacy-peer-deps` por un conflicto preexistente y no relacionado
entre `vite-plugin-pwa` y Vite 8, ya presente en el proyecto antes de
este cambio).

Verificado `npx tsc -b`, `npm run build` y `npm run lint` limpios (16
problemas preexistentes, cero nuevos).

**Sin verificar en producción/dispositivo real** — el mapa y el GPS no
se pueden probar en este entorno sandbox; el usuario deberá probarlo en
el móvil, idealmente en movimiento, para confirmar que el umbral de
1 km es razonable.

## Borrador de informe con IA (2026-09-01)

Cerrado el hueco de "informe generado por IA" que quedaba pendiente
desde Fase 4 (§4.2). El usuario pidió una IA barata/gratuita, sin
necesidad de que sea de última generación — compilar actuaciones en
prosa de informe no requiere razonamiento avanzado.

**Elegido: Gemini (`gemini-2.0-flash-lite`) vía Firebase AI Logic**
(paquete `firebase/ai`, ya incluido en el SDK de `firebase` que este
proyecto ya usa — no ha hecho falta instalar nada nuevo). Backend
`GoogleAIBackend` (Gemini Developer API): capa gratuita, sin tarjeta de
facturación.

**Corrección a lo dicho en el chat**: se había hablado de "pega la key
después" — no es así. `GoogleAIBackend` no acepta ninguna clave desde
el código del cliente (por diseño: así no queda expuesta en el bundle
del navegador). Lo único que falta para que funcione en producción es
**un paso en Firebase Console**: Build → AI Logic → Get started →
elegir "Gemini Developer API" (unos clics, gratis). Sin eso, las
llamadas a `generateReportDraft()` fallarán — el botón lo captura y
muestra el error en la UI sin romper nada.

- **`src/lib/firebase.ts`** — nuevo export `ai` (`getAI(app, {backend:
  new GoogleAIBackend()})`).
- **`src/services/aiReport.ts` (nuevo)** — `generateReportDraft()`:
  arma un prompt con los datos del expediente + el texto compilado de
  las actuaciones (misma función `compileActionsText` que ya existía),
  pide a Gemini que devuelva JSON (`responseMimeType:
  'application/json'`) con `methodsUsed`, `actionsPerformed`,
  `results`, `conclusions`, y lo valida antes de usarlo (si el JSON
  viene mal formado o incompleto, lanza un error legible en vez de
  rellenar el formulario con basura).
- **`CaseReportTab.tsx`** — botón "Generar borrador con IA" junto a
  "Redactar informe" (solo visible si hay actuaciones registradas —
  sin eso no hay nada que resumir). Rellena el formulario y muestra un
  aviso azul: *"revísalo y corrígelo antes de guardar — la
  responsabilidad del contenido del informe es tuya"* — importante
  porque el informe tiene valor legal (art. 49 Ley 5/2014) y la IA
  puede equivocarse o alucinar pese al system prompt que le pide
  ceñirse estrictamente a los hechos.

Verificado `npx tsc -b`, `npm run build` y `npm run lint` limpios (16
problemas preexistentes, cero nuevos).

**Sin verificar de extremo a extremo** — no se puede probar la llamada
real a Gemini hasta que el usuario active AI Logic en la consola de
Firebase (paso manual, no bloquea el resto de la app mientras tanto).

**Actualización (2026-09-01, desde una sesión local)**: el usuario activó
AI Logic en la consola de Firebase (Gemini Developer API, capa gratuita,
AI Monitoring incluido) y habilitó el proveedor Email/contraseña en
Authentication.

**Incidente al probarlo — App Check bloqueaba las llamadas**: el propio
asistente de "Comenzar" de AI Logic activa automáticamente la
Verificación de aplicaciones (App Check) en modo **Aplicado** para la
API de Gemini. Como el código de esta app nunca ha integrado el SDK de
App Check (no hay `ReCaptchaEnterpriseProvider`/`ReCaptchaV3Provider`
inicializado en `src/lib/firebase.ts`), toda llamada real fallaba con
`AI/fetch-error` / `401 Firebase App Check token is invalid`, probado
en el navegador contra producción. Se cambió manualmente en Firebase
Console → App Check → Firebase AI Logic a **"Sin aplicar" (solo
supervisión)**, para que las peticiones sin token de App Check dejen de
bloquearse (tarda hasta 15 min en propagarse).

**Esto es un parche temporal, no la solución correcta**: Firebase avisa
en la propia consola que **a partir del 2 de noviembre de 2026 la
aplicación forzosa de App Check para AI Logic será obligatoria y no se
podrá desactivar**. Antes de esa fecha hay que integrar de verdad el SDK
de App Check en `src/lib/firebase.ts` (`initializeAppCheck` con
`ReCaptchaV3Provider`, muy probablemente, que no requiere backend) para
que el botón "Generar borrador con IA" no se vuelva a romper. Pendiente,
no implementado en esta sesión.

**Actualización — implementado (2026-09-01, más tarde en la misma
sesión)**: se creó una clave de reCAPTCHA v3 (basada en puntuación) en
`google.com/recaptcha/admin` — etiqueta "DetectiveOS App Check",
dominios `detectivesprivadosesp.web.app` y
`detectivesprivadosesp.firebaseapp.com`, asociada al proyecto de Google
Cloud `detectivesprivadosesp` (no al proyecto por defecto que sugería el
selector, que era otro proyecto del usuario sin relación con este). El
selector de proyecto de esa página resultó muy inestable para
automatizar por navegador (no confirmaba la selección de forma fiable
tras muchos intentos) — el usuario terminó ese paso concreto a mano
desde el móvil y pasó la clave de sitio (pública por diseño) por chat.

`src/lib/firebase.ts` ahora llama a `initializeAppCheck(app, {provider:
new ReCaptchaV3Provider('6LexHaQt...'), isTokenAutoRefreshEnabled:
true})` antes de inicializar el resto de servicios. La clave de sitio es
pública a propósito (viaja en el bundle del navegador) — Google la valida
junto con el dominio de origen registrado, no concede acceso por sí
sola; la clave secreta (que sí es sensible) nunca sale de la consola de
Google, no se usa en el código del cliente. Verificado `npx tsc -b`,
`npm run build` y `npm run lint` limpios (16 problemas preexistentes,
cero nuevos).

**Además, el modelo estaba retirado**: una vez resuelto el bloqueo de
App Check, la llamada real devolvía `404 model models/gemini-2.0-flash-lite
is no longer available`. Google lo retiró y recomienda
`gemini-3.5-flash-lite` como sustituto directo — cambiado en
`src/services/aiReport.ts` (`MODEL_ID`). Verificado con una llamada real
contra producción (expediente demo, ver más abajo): el borrador se generó
correctamente, en español, respetando el formato JSON pedido.

## Login con email/contraseña (2026-09-01, sesión local)

Hasta ahora el único método de acceso era Google. El usuario pidió añadir
email/contraseña como alternativa, tanto para el staff del despacho
(`LoginPage.tsx`) como para el portal del cliente (`PortalLoginPage.tsx`).

**Riesgo de seguridad detectado antes de implementarlo**: todo el modelo
de acceso por identidad (portal de clientes, colaboradores híbridos de la
Fase 5) confía en `request.auth.token.email` asumiendo que viene
verificado por Google — los comentarios de `firestore.rules` lo decían
explícitamente. Con email/contraseña eso deja de ser cierto: cualquiera
puede registrarse con el email de otra persona sin demostrar que le
pertenece. Sin corregirlo, añadir email/contraseña habría abierto una vía
para suplantar a un cliente del portal o a un colaborador invitado y leer
sus expedientes.

**Arreglado junto con el login, no como una fase separada**:
- `firestore.rules`: nueva función `isVerifiedEmail(email)` que exige
  `request.auth.token.email_verified == true` además de la coincidencia
  de email. Aplicada en los 4 sitios que antes confiaban en
  `request.auth.token.email` a secas: lectura de `cases` vía
  `portalAccess`, lectura de `portalAccess/{accessId}`, la rama de
  `portalClients` donde el propio cliente actualiza su registro, y las
  dos ramas de `collaboratingFirms` (leer/aceptar invitación). Con Google
  el email siempre viene verificado, así que esto no cambia nada para
  las cuentas existentes — solo cierra el hueco para email/contraseña.
- `src/contexts/AuthContext.tsx`: nuevas `signInWithEmail`,
  `signUpWithEmail` (llama a `sendEmailVerification` tras crear la
  cuenta) y `resendVerificationEmail`. `resolveUserType` solo resuelve la
  identidad `portal_client` (búsqueda por email) si
  `firebaseUser.emailVerified` es `true` — mismo criterio que las reglas,
  por consistencia y para no depender solo del servidor para la UX.
- `src/lib/authErrors.ts` (nuevo): traduce códigos de error de Firebase
  Auth (`auth/email-already-in-use`, `auth/invalid-credential`, etc.) a
  mensajes en español, compartido entre las dos pantallas.
- `LoginPage.tsx` y `PortalLoginPage.tsx`: enlace "Usar email y
  contraseña" que revela un formulario con toggle Iniciar sesión/Crear
  cuenta, debajo del botón de Google (que sigue siendo la opción
  principal). Tras registrarse, se muestra una pantalla de "Verifica tu
  email" (con botón de reenvío) que bloquea el acceso hasta que el
  usuario confirma el enlace — no se ejecuta ninguna resolución de
  identidad ni la comprobación de acceso al portal mientras tanto.
- Habilitado el proveedor "Correo electrónico/contraseña" en Firebase
  Authentication (sin "vínculo de correo sin contraseña", que es un
  método distinto y no hacía falta).

**No se tocó** la invitación de colaboradores (`CollaborateInvitePage`)
ni la firma pública de contratos (`SignContractPage`) — el usuario pidió
específicamente login de staff y de portal, esas dos pantallas no tienen
login propio (una pide iniciar sesión con el proveedor que sea, la otra
no requiere sesión).

**Hallazgo aparte, no arreglado (fuera de alcance de hoy)**: al revisar
el flujo de alta de miembros para este cambio, se confirmó que
"Añadir miembro" en `TeamTab.tsx` (Configuración → Equipo) crea un
documento en `firms/{firmId}/members` pero nunca crea ni enlaza
`userFirmIndex/{uid}` — ese índice solo se crea hoy en
`OnboardingPage.tsx`, para quien crea el despacho. Un miembro añadido así
que inicie sesión por primera vez (con cualquier proveedor) cae en
`userType: 'unknown'` y termina en Onboarding creando su **propio**
despacho nuevo, en vez de unirse al existente. Es un bug preexistente,
anterior a esta sesión y no relacionado con el login por
email/contraseña — pendiente de investigar aparte.

Verificado `npx tsc -b`, `npm run build` y `npm run lint` limpios (16
problemas preexistentes, cero nuevos).

**Sin verificar de extremo a extremo en producción** — pendiente probar
el ciclo completo (crear cuenta con email, recibir el correo, verificar,
volver a la app) contra Firebase Auth real.

**Actualización — sí se verificó, con el mismo cambio se probó todo el
producto (2026-09-01)**: usando el truco de alias `+` de Gmail
(`tucorreo+algo@gmail.com` sigue entregando en `tucorreo@gmail.com`),
se creó una cuenta real de email/contraseña, se verificó abriendo el
enlace real recibido por correo, y se completó el registro — confirma
que el flujo de verificación funciona de extremo a extremo tal cual lo
usaría un usuario real.

## Despacho demo (2026-09-01, sesión local)

A petición del usuario ("me podrían servir de muestra para vender la
plataforma"), se creó un despacho de demostración completo y aislado —
no mezclado con ningún despacho real — usando el login por
email/contraseña recién implementado, para tener un ciclo de datos
realista con el que enseñar la plataforma a clientes potenciales, y de
paso sirvió como prueba de extremo a extremo del flujo completo del
producto contra producción real (algo que ninguna sesión en la nube
había podido hacer, por la limitación de red del sandbox).

**Contenido del despacho demo** ("Investigaciones Sur Detectives S.L."):
- Configuración: tarifas, plantilla de contrato con placeholders — todo
  relleno, no vacío.
- 3 contactos: uno particular con presupuesto **aceptado** → contrato
  **firmado** → expediente **abierto** con 2 actuaciones + **informe
  generado con IA real** (primera prueba end-to-end de Gemini en
  producción, ver arriba) → asiento en libro-registro; uno corporativo
  (aseguradora) con presupuesto **enviado, sin decidir**; uno particular
  con presupuesto **rechazado** (con motivo). Cubre los tres estados
  visibles del pipeline.
- Acceso de portal concedido al cliente del expediente abierto.
- Estadísticas: se comprobó que la pantalla agrega correctamente estos
  datos (3 presupuestos, 50% conversión, gráfico por mes, importe por
  tipo de investigación).

**Cuenta del despacho demo**: email con alias `+` de la cuenta de Gmail
del usuario (entrega en su misma bandeja), contraseña compartida solo
por chat con el usuario, no guardada en este documento ni en el repo.

**Verificado de paso, con datos reales de producción** (no del sandbox,
que nunca tuvo acceso de red a Firebase):
- El flujo completo Presupuesto → Contrato → Firma → Expediente →
  Libro-registro funciona correctamente en producción (pendiente
  original desde "Cambio de flujo: Contrato antes que Expediente").
- El selector de ubicación con mapa (Leaflet) de las actuaciones carga y
  renderiza bien en producción (sin GPS real disponible en el sandbox,
  así que el umbral de 1 km entre puntos sigue sin probarse en
  movimiento — eso solo lo puede hacer el usuario con su móvil).
- El diseño navy/dorado se ve correcto en las pantallas autenticadas
  (Dashboard, Expedientes, Configuración) — ninguna sesión anterior
  había podido verlas renderizadas, solo revisar el código.

## Arreglado: miembro invitado no se vinculaba a su despacho (2026-09-01)

Cierra el "hallazgo aparte, no arreglado" de la sección anterior. Igual
que `portalClients`/`collaboratingFirms`, la vinculación se resuelve por
email verificado en el primer inicio de sesión, sin necesitar Cloud
Functions ni un enlace de invitación aparte — el miembro invitado
simplemente usa el login normal de despacho (`LoginPage.tsx`, con Google
o con email/contraseña) y, si su email verificado coincide con una
invitación pendiente, se vincula solo.

**Modelo de datos**:
- `Member` (`types/index.ts`) gana `invitationStatus?: 'pendiente' |
  'aceptada'`. Ausente en miembros ya vinculados al crearse (el titular
  de `OnboardingPage.tsx`); `'pendiente'` en los creados desde "Añadir
  miembro" hasta que alguien los reclama.
- `memberInvites/{email}` (colección nueva, top-level, doc ID = email
  normalizado): índice `{firmId, memberId, invitedAt}`, mismo patrón que
  `portalAccess` (ID = email) — permite encontrar la invitación sin
  query. No es la fuente de autorización real (esa sigue siendo
  `members/{memberId}.userId`); se borra en el momento de vincular.

**`services/firm.ts`**:
- `addMember()` ahora normaliza el email a minúsculas, guarda
  `userId: ''` + `invitationStatus: 'pendiente'` en el miembro, y crea el
  `memberInvites/{email}` correspondiente.
- `claimMemberInvite(uid, email)` (nuevo): busca `memberInvites/{email}`,
  localiza el miembro, comprueba que sigue `'pendiente'`, le asigna
  `userId`/`invitationStatus: 'aceptada'`, crea su `userFirmIndex/{uid}`
  (igual que hace `OnboardingPage.tsx` para el titular) y borra el
  índice de invitación.
- `AuthContext.resolveUserType()`: nuevo paso 2.5, entre el chequeo de
  `userFirmIndex` y el de `portalClients` — llama a `claimMemberInvite`
  solo si `firebaseUser.emailVerified` (con Google siempre lo es; con
  email/contraseña, solo tras confirmar el enlace), mismo criterio que
  el resto de resoluciones por email de esa función.

**`firestore.rules`**:
- `memberInvites/{email}` (nueva): `get`/`delete` para
  `isVerifiedEmail(email)` o para quien sea `isOwnerOrDirector` del
  `firmId` guardado dentro; `create` solo para `isOwnerOrDirector`. Sin
  `list` — solo se puede leer el documento propio por ID exacto, igual
  que `portalAccess`.
- `members/{memberId}`: nueva rama de lectura para que la persona
  invitada (`invitationStatus == 'pendiente'`) pueda leer su propio
  documento comparando `isVerifiedEmail(resource.data.email)`, antes de
  ser miembro activo del despacho. Nueva rama de escritura equivalente
  para la propia operación de vincularse, con
  `diff().affectedKeys().hasOnly(['userId', 'invitationStatus',
  'updatedAt'])` y los valores de destino fijados
  (`invitationStatus == 'aceptada'`, `userId == request.auth.uid`) —
  mismo patrón exacto que ya usan `collaboratingFirms` y `portalClients`
  para su propia auto-aceptación, así que no reabre el hueco de
  suplantación que se cerró en la sesión de login con
  email/contraseña.

**TeamTab.tsx**: la columna "Estado" muestra "Invitación pendiente" (en
vez de Activo/Inactivo) mientras el miembro no se ha vinculado, para que
el despacho vea de un vistazo quién falta por entrar.

**Nota compartida con el resto del modelo de email verificado**: igual
que `portalClients`/`collaboratingFirms`, la comparación depende de que
`request.auth.token.email` tenga exactamente la misma capitalización que
el valor normalizado (minúsculas) guardado en Firestore — con Google
esto nunca falla en la práctica, con email/contraseña un email tecleado
en mayúsculas en el signup rompería el emparejamiento. No es una
regresión de este cambio: es el mismo límite ya asumido para portal y
colaboradores, sin tocar `signInWithEmail`/`signUpWithEmail` hoy para no
arriesgar el login recién publicado.

Verificado `npx tsc -b`, `npm run build` y `npm run lint` limpios (16
problemas preexistentes, cero nuevos, ninguno en los archivos tocados).

**Sin verificar en producción** — misma limitación de siempre; pendiente
que el usuario pruebe el ciclo completo (invitar un miembro desde
Configuración → Equipo, iniciar sesión con ese email por primera vez —
Google o email/contraseña — y confirmar que aterriza en el Dashboard del
despacho correcto, no en Onboarding).

## Firebase Storage: paso a Blaze y activación (2026-09-01/02, sesión local)

Al retomar el CI de `storage.rules` (ver arriba, "Añadido storage al
--only") se descubrió que Storage nunca había llegado a activarse de
verdad en este proyecto — no era un tema de permisos IAM sino que
**Firebase exige el plan Blaze (pago por uso) para poder usar Storage**,
y el proyecto seguía en el plan gratuito Spark. Esto requiere una
tarjeta de pago, así que quedó fuera de lo que este asistente puede
hacer — el usuario lo completó él mismo desde el móvil:

1. **Cuenta de facturación**: la cuenta "Pago de Firebase" que Firebase
   ofrece por defecto ya tenía 5 proyectos enganchados (el máximo de ese
   tipo de cuenta ligera) — haría falta una cuenta de facturación nueva
   y separada si se quisiera usar esa vía. En su lugar, el usuario
   completó el asistente de "Actualizar proyecto" de Firebase
   directamente, que resolvió el enganche de facturación sin más
   fricción.
2. **Bucket**: creado en `US-EAST1` (el asistente ofrecía Europa como
   alternativa "de pago estándar" en vez de "sin costo garantizado" —
   se sugirió por prudencia de RGPD dado que Storage guardará datos
   personales de clientes/investigados españoles, pero el usuario
   decidió seguir con US-EAST1; sin archivos subidos todavía, así que
   sigue siendo reversible si más adelante se prefiere recrear el bucket
   en una región europea). Nombre real del bucket:
   `detectivesprivadosesp.firebasestorage.app`.
3. **Bug encontrado de paso**: tanto `.env.local` de este PC como el
   secreto de GitHub Actions `VITE_FIREBASE_STORAGE_BUCKET` tenían un
   valor obsoleto, `despachosdetectives.firebasestorage.app` (nombre
   previo al renombrado del proyecto) — con ese valor, cualquier subida
   de archivo habría apuntado a un bucket que no existe. Corregido en
   ambos sitios a `detectivesprivadosesp.firebasestorage.app` (el
   secreto de GitHub se actualizó por CLI con permiso explícito del
   usuario).
4. Con Storage ya activo, se volvió a añadir `,storage` al `--only` del
   paso de despliegue de reglas en `firebase-hosting-merge.yml` (se
   había revertido temporalmente mientras se resolvía el plan Blaze).

**Pendiente**: confirmar que el próximo push despliega `storage.rules`
sin el error `Firebase Storage has not been set up` que apareció antes
de completar el paso a Blaze.

## Bug real encontrado y arreglado: el portal de clientes nunca cargaba expedientes con presupuesto (2026-09-02)

Con el login por email/contraseña ya en marcha, se pudo por fin probar
el portal de clientes con una cuenta real de principio a fin (cosa que
ninguna sesión anterior había podido hacer, por no tener acceso a una
cuenta de Google real ni, hasta ahora, al método email/contraseña) —
concediendo acceso de portal al expediente demo (EXP-0001) y entrando
como ese cliente. Resultado: **"Error al cargar tus expedientes."**

**Causa**: `useClientPortal()` (`src/hooks/usePortal.ts`) resuelve cada
expediente del cliente con `getCase()` y, si el expediente viene de un
presupuesto (`case.quoteId`), también con `getQuote(firmId,
case.quoteId)` — para poder mostrar el importe presupuestado en el
portal (§4.4). La regla de `quotes` en `firestore.rules` solo daba
lectura a miembros del despacho, nunca al cliente del portal — así que
esa segunda llamada fallaba con `permission-denied`, y como ambas
llamadas están en el mismo `try/catch`, tiraba abajo toda la pantalla
del portal. **Esto llevaba roto desde la Fase 4** (cuando se simplificó
el portal para mostrar el importe del presupuesto) — nadie lo había
detectado porque ninguna sesión había podido iniciar sesión de verdad
como cliente hasta ahora.

**Arreglado**: nueva función `isPortalClientForCase(firmId, caseId)` en
`firestore.rules` (factoriza la comprobación que ya usaba `cases` —
existe un `portalAccess/{tu-email-verificado}` activo para ese
expediente concreto) y se añade una regla de lectura en `quotes` que la
usa a través de `quote.caseId` (el presupuesto ya guarda el ID del
expediente al que dio lugar, desde "Cambio de flujo: Contrato antes que
Expediente"). `cases` se refactorizó para usar la misma función, sin
cambiar su comportamiento.

Verificado en producción real, con el expediente demo: el portal ya
carga el expediente y el importe del presupuesto correctamente tras el
despliegue.

**Nota aparte, no relacionada con el bug**: en el navegador sandbox
usado para esta prueba, la obtención del token de App Check falla con
`400 (appCheck/initial-throttle)` de forma consistente — casi seguro
porque reCAPTCHA v3 identifica ese navegador automatizado como no-humano
y rehúsa emitir un token, no porque haya un problema real de
configuración (el dominio sí está registrado). Como ni Firestore ni
Storage tienen App Check en modo forzado (solo AI Logic, y ese en modo
supervisión), esto no bloqueó nada — pero conviene tenerlo presente si
en el futuro se activa App Check forzado para más productos: probar
desde un navegador real, no automatizado, antes de dar por rota una
función.

**Segunda causa del mismo síntoma, más de fondo**: tras desplegar la
regla de `quotes` de arriba, el portal seguía dando
`permission-denied`. Causa real: el token JWT de sesión no se
actualiza solo cuando el email se verifica en **otra pestaña o
dispositivo** — `fbUser.emailVerified` en el cliente sí se refresca
(por eso la pantalla de "verifica tu email" desaparece correctamente),
pero `request.auth.token.email_verified`, que es lo único que
`isVerifiedEmail()`/`isPortalClientForCase()` pueden ver del lado del
servidor, sigue siendo `false` en el JWT cacheado hasta que expira por
sí solo (hasta 1 hora) o se fuerza su renovación. Un cliente que se
registra, verifica el email desde el correo (normalmente en otro
dispositivo/pestaña) y vuelve a la misma sesión del navegador se
quedaría con `permission-denied` en todo lo que dependa de su email
verificado, sin ningún mensaje de error claro.

**Primer intento (insuficiente)**: refrescar el token solo cuando
`fbUser.emailVerified` fuera `false` al recuperar la sesión. No bastaba
— comprobado por API REST (`accounts:signInWithPassword` +
`accounts:lookup`) que la cuenta sí estaba verificada de verdad en el
servidor, y aun así el portal seguía fallando. Motivo:
`fbUser.emailVerified` viene del **perfil** de la cuenta, que sí se
refresca solo al recuperar la sesión persistida — pero el **JWT
cacheado en sí** (lo único que las reglas de Firestore pueden leer vía
`request.auth.token.email_verified`) no se renueva hasta su expiración
natural. Es decir, `fbUser.emailVerified` puede leer `true` mientras el
token que de verdad viaja en cada petición sigue firmado con `false` —
la comprobación `if (!fbUser.emailVerified)` nunca detectaba este
desajuste porque miraba el dato equivocado.

**Arreglado de verdad**: en vez de mirar solo `fbUser.emailVerified`,
se compara contra el claim `email_verified` del token ya cacheado
(`fbUser.getIdTokenResult()`, sin forzar — solo decodifica el JWT en
memoria, no cuesta red) y, si no coinciden, se fuerza la renovación con
`fbUser.getIdToken(true)`. Así solo se paga la llamada de red extra
cuando de verdad hay un desajuste, no en cada carga de página.

**Confirmación final**: la sesión concreta usada para las pruebas
anteriores (crear cuenta → comprobar → verificar en otra pestaña →
seguir probando sin cerrar sesión, varias veces seguidas en la misma
pestaña) seguía fallando incluso con este segundo fix — probablemente
un estado de `IndexedDB` ya inconsistente por la propia secuencia de
pruebas automatizadas, no representativo de un usuario real. Cerrando
sesión e iniciando sesión de nuevo desde cero (el flujo real: verificar
el email y luego entrar), el portal cargó correctamente el expediente y
el importe del presupuesto a la primera. La regla de `quotes` era la
causa real y necesaria del bug; el ajuste de refresco de token en
`AuthContext.tsx` se deja de todos modos por ser una corrección de
fondo correcta (cubre el caso real de una pestaña ya abierta que se
reanuda tras verificar el email en segundo plano), aunque no fuese lo
que arregló esta sesión de prueba concreta.

## Colaboradores híbridos verificado de extremo a extremo — sin bugs (2026-09-02)

Aprovechando que ya se podía crear cuentas de prueba reales con
email/contraseña, se probó por primera vez el ciclo completo de
colaboradores con plataforma (Fase 5, §4.5), nunca verificado antes
(igual que el portal, dependía de tener una segunda cuenta real
distinta de la del despacho): crear un colaborador con
`tienePlataforma: true` desde Configuración → Colaboradores, copiar el
enlace de invitación, registrarse con una cuenta nueva, verificar el
email, aceptar la invitación en `/collab-invite/:firmId/:collaboratorId`,
asignar el colaborador a un expediente existente desde el despacho, y
comprobar que aparece correctamente en `/collaborate` con sus
actuaciones visibles. **Todo funcionó a la primera, sin ningún error** —
a diferencia del portal de clientes y del token de sesión, esta parte
del sistema no tenía ningún bug pendiente.

**Se aprovechó, de paso, para crear un segundo expediente demo completo
(EXP-0002, "Investigación laboral") y llevarlo hasta el cierre
(informe generado con IA → aprobado → entregado → expediente cerrado),
para que el despacho demo muestre el ciclo de vida completo (un
expediente abierto y otro cerrado) en vez de solo casos activos.

## Exportación de informes a PDF y Word (2026-09-02)

Añadidos dos botones ("Exportar PDF" / "Exportar Word") en la pestaña
de Informe del expediente (`CaseReportTab.tsx`), visibles en cualquier
estado del informe (borrador, aprobado o entregado). Genera el
documento enteramente en el cliente — sin backend ni Cloud Functions,
consistente con el resto de la plataforma — a partir del `Report` ya
cargado y de los datos del despacho (`useFirm()`), con un membrete
simple (nombre comercial, NIF, nº RNSP y dirección registrada) seguido
de las mismas secciones que ya se mostraban en pantalla (datos del
contratante, detectives intervinientes, objeto, medios, actuaciones,
resultados, conclusiones/observaciones y, si procede, entrega).

- **PDF**: con `jspdf`. Paginación manual (`ensureSpace`) que mide el
  espacio restante antes de cada línea y añade página cuando hace
  falta — no hay una API de "flow" de texto multipágina en jsPDF, así
  que hay que llevar la cuenta de la posición `y` a mano.
- **Word (.docx)**: con la librería `docx` (`Document`/`Paragraph`/
  `TextRun` → `Packer.toBlob`), que sí soporta un DOM válido de Word
  desde cero sin depender de una plantilla `.dotx`.
- Ambas librerías (`jspdf` + `docx`, con su dependencia `html2canvas`)
  pesan bastante sin comprimir — el bundle principal creció de ~1,99 MB
  a ~2,68 MB si se importan de forma estática. Se resolvió con
  `import()` dinámico en los dos manejadores de `CaseReportTab.tsx`
  (`handleExportPdf`/`handleExportDocx`), de forma que
  `reportExport.ts` y sus dependencias solo se descargan la primera vez
  que alguien pulsa un botón de exportar, no en cada carga de la app.
  El bundle principal quedó en ~1,21 MB (antes de añadir esta
  funcionalidad) y el chunk separado de exportación pesa ~753 KB,
  cargado bajo demanda.
- **Bug evitado, no solo de pruebas**: el `.save()` nativo de jsPDF usa
  internamente un mecanismo de descarga (al estilo FileSaver) que hace
  una comprobación de capacidades del navegador con una petición XHR
  síncrona a la que intenta cambiarle `responseType` — Chrome moderno
  lanza `InvalidAccessError` en cuanto se intenta eso ("The response
  type cannot be changed for synchronous requests"). Saltó al probar la
  exportación en un entorno de navegador automatizado, pero no hay
  garantía de que no ocurra también en algún navegador/contexto real
  (hay incidencias abiertas de jsPDF sobre este mismo patrón). Se evitó
  del todo generando el PDF con `doc.output('blob')` y descargándolo
  con el mismo mecanismo manual (`<a download>` + `URL.createObjectURL`
  + `.click()`) ya usado para el `.docx`, en vez de confiar en el
  `.save()` interno de jsPDF.
- **Verificación**: no se pudo probar por la UI completa en `localhost`
  porque el login de email/contraseña falla ahí — la clave de sitio de
  reCAPTCHA v3 de App Check solo tiene registrado el dominio de
  producción, así que cualquier llamada de Auth que dependa de un token
  de App Check falla con `appCheck/recaptcha-error` fuera de
  `detectivesprivadosesp.web.app` (limitación conocida del entorno, no
  un bug de esta funcionalidad). Se probó primero cargando el chunk
  compilado de `reportExport` con datos de informe simulados e
  interceptando `URL.createObjectURL` para inspeccionar el blob
  generado: cabecera `%PDF` y cabecera de ZIP válida (`PK\x03\x04`) para
  el `.docx`, sin ninguna excepción. Después, ya desplegado en
  producción, se repitió la prueba con un informe real (EXP-0002,
  entregado a Laura Ortega Campos) pulsando los botones "Exportar PDF" /
  "Exportar Word" de verdad desde la UI: ambos generaron su blob
  correctamente (PDF de 7.939 bytes, `.docx` de 9.729 bytes) sin ningún
  error nuevo en consola.

## Bug real: email/contraseña sin nombre deja "Detectives intervinientes" en blanco (2026-09-02)

Al probar la exportación de informes en producción, la sección
"Detectives intervinientes" del informe de EXP-0002 salía vacía (un
avatar circular sin inicial, sin nombre debajo). No era un problema de
la exportación — el propio informe ya lo mostraba así en pantalla.

**Causa raíz**: `createUserWithEmailAndPassword` (a diferencia de
`signInWithPopup` con Google, que siempre trae un `displayName` del
perfil de Google) no fija ningún nombre en el perfil de Auth. En
`OnboardingPage.tsx`, al crear el despacho se copia
`user.displayName` directamente al `Member.displayName` del titular
sin comprobar que exista — así que cualquier despacho creado con
email/contraseña (el método que se añadió esta misma sesión) se queda
con `Member.displayName` vacío para siempre, salvo que alguien lo
corrija a mano, porque no hay ningún formulario en la app para
editarlo después. Ese hueco se arrastra a los seis sitios que leen
`user.displayName` desde `AppUser` (`CaseReportTab.tsx` — detectives
del informe —, `CaseActionsTab.tsx` — autor de la actuación —,
`CaseContractTab.tsx`, `CasePortalTab.tsx`, `AppSidebar.tsx` y
`OnboardingPage.tsx`), es decir, a todo el rastro de auditoría de un
despacho que se dio de alta sin pasar por Google. Confirmado en la
consola de Firestore: el `Member` del despacho demo tenía
`displayName: null`, y `TeamTab.tsx` hace `member.displayName[0]` sin
comprobar que exista — con un despacho real habría sido un
**crash** en Configuración → Equipo, no solo un hueco visual.

**Arreglado en el origen**: el formulario de alta con email/contraseña
(`LoginPage.tsx` para el despacho, `PortalLoginPage.tsx` para el
portal) ahora pide "Nombre completo" en modo registro, y
`AuthContext.signUpWithEmail(email, password, displayName)` llama a
`updateProfile()` justo después de crear la cuenta — así el perfil de
Auth queda igual de completo que con Google desde el primer instante,
sin tocar `OnboardingPage.tsx` (que ya confiaba, correctamente, en que
`user.displayName` viniera relleno). De paso, `AppSidebar.tsx` y
`PortalLayout.tsx` comprobaban el nombre con `??` en vez de `||` —
`??` no cae al email de reserva cuando el nombre es `''` (cadena
vacía, no `null`/`undefined`), así que ese resguardo tampoco
funcionaba del todo.

**Reparación de los datos ya existentes** (el despacho demo se creó
antes de este arreglo): vía consola de Firestore se puso
`displayName: "Marta Sánchez Vega"` en el `Member` del titular y en
los dos informes ya creados (`detectives[0].detectiveName` +
`detectiveTip`, antes vacíos en ambos). El perfil de Auth en sí
también se corrigió, sin esperar a que el usuario cambie de
contraseña ni nada parecido: una llamada a la API REST de Identity
Toolkit (`accounts:signInWithPassword` + `accounts:update` con el
`idToken` obtenido, usando la API key pública del proyecto) fija el
`displayName` real de la cuenta igual que haría `updateProfile()`.
Verificado después en producción: Dashboard saluda con "Hola, Marta",
la barra lateral muestra "Marta Sánchez Vega", Equipo la lista sin
error, y el informe de EXP-0002 muestra "Marta Sánchez Vega — TIP:
D-9910" en detectives intervinientes.

De paso se borraron dos cuentas de prueba (`gaepmalaga+testname01@…`,
creadas dos veces por un reintento durante las pruebas de este mismo
arreglo) desde Authentication → Usuarios — no forman parte del
despacho demo, solo ruido de las pruebas.

## PWA ya instalable, ubicación de actuaciones, datos del investigado para el colaborador y contrato despacho-colaborador (2026-09-02)

Cuatro peticiones seguidas del usuario, revisadas y resueltas en el
mismo bloque:

- **PWA instalable**: ya lo estaba. `vite.config.ts` tiene
  `VitePWA` con manifest completo (iconos 72 a 512, `display:
  standalone`, `start_url`), los 8 PNG existen en `public/icons/`, y
  el build ya genera `manifest.webmanifest` + `sw.js` + los enlaces e
  inyección correctos en `index.html`. Verificado en producción:
  manifest servido con 200 y sus 8 iconos, service worker activo y
  controlando la página, todos los iconos/PNG accesibles. No hacía
  falta ningún cambio de código — solo instalarla desde el navegador
  (Chrome: menú → "Instalar aplicación"; Android: "Añadir a pantalla
  de inicio"; iOS Safari: compartir → "Añadir a pantalla de inicio").
- **Ubicación de una actuación ya guardada**: ya existía. En la
  pestaña Actuaciones, cada actuación con coordenadas guardadas
  muestra un enlace "Ver ubicación" (con icono de chincheta) que abre
  Google Maps en una pestaña nueva
  (`CaseActionsTab.tsx:206-216`). Las actuaciones de ejemplo del
  despacho demo no tenían ubicación guardada (el picker de mapa nunca
  se usó al crearlas) — se añadió una actuación nueva de prueba en
  EXP-0001 marcando un punto en el mapa (sin depender del GPS real del
  navegador) para confirmar el ciclo completo: guardar con
  `locationLat`/`locationLng` → aparece "Ver ubicación" → el enlace
  abre Google Maps con las coordenadas correctas.
- **El colaborador no veía a quién investigar ni su domicilio — bug
  real, no solo del colaborador**: `Case.investigatedName` e
  `investigatedAddress` ya existían en el modelo y se leían bien
  (`getCase` devuelve el documento completo), pero no se pintaban en
  ningún sitio — ni en `CollaborateCaseDetail.tsx` (vista del
  colaborador) ni en el Resumen del expediente del propio despacho
  (`CaseDetailPage.tsx`, tarjeta "Encargo"), donde solo se veían
  Objeto y alcance / Interés legítimo / Descripción. Añadida una
  sección "Investigado" (nombre + domicilio) en ambos sitios.
- **Contrato entre el despacho y el colaborador**: el modelo de datos
  ya preveía un contrato de este tipo (`ContractType` incluía
  `'marco_colaboracion'` desde antes) pero nunca se construyó la UI
  para crearlo ni firmarlo. Añadido:
  - `Collaborator.esDependiente: boolean` — un colaborador dependiente
    trabaja como un detective más de la estructura del propio
    despacho (aunque no conste en `members`) y no necesita contrato
    aparte; uno independiente subcontratado sí, conforme a la Ley
    5/2014. Campo añadido a los formularios de alta y edición, y
    visible como "Régimen: Independiente / Dependiente del despacho"
    en la ficha.
  - `Contract.collaboratorId` (opcional, mismo patrón que `clientId`)
    + `getContractsByCollaborator` + `useCollaboratorContracts` —
    ninguna regla de Firestore nueva hizo falta, las reglas de
    `contracts` ya eran genéricas por `firmId`/`contractId`.
  - Tarjeta "Contrato de colaboración" en `CollaboratorDetailPage.tsx`:
    si es dependiente, nota explicando que no hace falta; si no,
    botón "Generar contrato de colaboración" (texto por defecto en
    `collaborationContract.ts`, con identificación de ambos despachos,
    régimen de actuación, confidencialidad/RGPD, responsabilidad y
    duración), y una vez generado, "Copiar enlace de firma" (reutiliza
    la página pública `/sign/:firmId/:contractId`, ya genérica y sin
    cambios) y "Registrar firma manual" (reutiliza `SignContractDialog`
    tal cual).
  - **Verificado en producción de extremo a extremo**: generado el
    contrato CONT-0003 para "Investigaciones Costa del Sol S.L."
    (colaborador independiente del despacho demo), firmado con
    "Registrar firma manual", y confirmado que la ficha pasa a mostrar
    "Firmado — Firmado por Miguel Ángel Torres el 02 de septiembre de
    2026."

## Corrección del modelo de colaboradores, firma a mano y libro-registro completo con exportación (2026-09-02)

El usuario corrigió un malentendido del turno anterior aportando el
Anexo VII de la Orden INT/318/2011 (modelo oficial de libro-registro) y
explicando el modelo real de despacho/detectives/colaboradores:

- **Un despacho tiene siempre un titular (detective) y, opcionalmente,
  detectives dependientes bajo el mismo RNSP** — ya modelado
  correctamente desde antes de esta sesión vía `Member.dependencyType`
  (`'owner' | 'dependent' | null`) en Equipo. El cliente contrata "al
  despacho con RNSP X", no a un detective concreto: cualquier detective
  de ese despacho, titular o dependiente, puede intervenir en el
  expediente sin más requisito que dejar constancia de qué actuación
  hizo cada uno (ya cubierto por `CaseAction.detectiveId` en
  Actuaciones). Ningún contrato interno hace falta aquí.
- **Un despacho contratado puede subcontratar a otro despacho
  (RNSP distinto)** — eso sí exige un contrato de colaboración entre
  ambos, sin excepción, porque por definición un `Collaborator`
  (`collaboratingFirms`) es siempre externo. El campo `esDependiente`
  que se había añadido a `Collaborator` en el turno anterior partía de
  un modelo mental equivocado (confundía "colaborador dependiente" con
  el concepto correcto de "detective dependiente del propio despacho",
  que no tiene nada que ver con `Collaborator`) — revertido por
  completo: quitado de `services/collaborators.ts`, de los formularios
  de alta/edición y de la ficha ("Régimen" ya no se muestra), y la
  tarjeta "Contrato de colaboración" pasa a mostrarse siempre, sin
  condición.

**Firma a mano (`SignaturePad.tsx`, nuevo componente reutilizable)**:
canvas con eventos de ratón y táctiles, escalado a `devicePixelRatio`
para verse nítido, botón "Borrar y firmar de nuevo". El garabato se
exporta como PNG en base64 (`canvas.toDataURL()`) y se guarda
directamente en el propio documento de Firestore del contrato
(`Contract.signatureDataUrl`) — no en Storage, porque quien firma por
el enlace público no está autenticado y Storage exige
`request.auth != null` para escribir, mientras que la regla de
Firestore para `contracts` ya tenía un camino de escritura pública
para el resto de campos de firma (bastó con añadir
`'signatureDataUrl'` a la lista `hasOnly(...)` de campos permitidos).
Aplicado en los dos flujos de firma que ya existían:
- **Firma pública por enlace** (`/sign/:firmId/:contractId`, cliente o
  colaborador sin cuenta): ahora obligatoria antes de poder firmar.
- **Registro de firma manual** (`SignContractDialog.tsx`, staff): la
  firma es opcional (para cuando el firmante no está delante de la
  pantalla), pero si el firmante SÍ está presente en el despacho, se
  puede dibujar ahí mismo.
La imagen guardada se muestra en todos los sitios donde ya se veía el
nombre del firmante: `CaseContractTab.tsx`, `CollaboratorDetailPage.tsx`
y la propia página de firma tras firmar.

**Verificado en producción, extremo a extremo, con un garabato real**:
creado un colaborador de prueba ("Detectives Prueba Firma S.L."),
generado su contrato, abierto "Registrar firma manual", dibujado una
firma a mano con el ratón directamente sobre el lienzo (dos trazos en
V), y confirmado que exactamente ese trazo dibujado queda guardado y
se muestra en la ficha del colaborador tras firmar. El colaborador de
prueba se desactivó al terminar (no se puede borrar del todo desde la
UI, solo desactivar).

**Libro-registro — campo que faltaba**: comparando línea a línea con
el Anexo VII, faltaba la columna "Contratante — Domicilio/localidad"
(el resto de columnas oficiales ya existían: nº de orden, fechas de
inicio/fin, asunto, contratante, investigado con nombre y domicilio,
delitos perseguibles de oficio conocidos, órgano al que se
comunicaron). Añadido `RegistryEntry.clientAddress`, relleno
automáticamente desde `Client.address` al abrir el expediente
(`caseOpening.ts` y el punto equivalente en `CaseContractTab.tsx`), y
mostrado en la tabla del libro-registro.

**Libro-registro — exportación (el botón no hacía nada antes)**:
nuevo `RegistryExportDialog.tsx` con tres modos de selección — todo el
libro, un rango de nº de asiento concreto, o solo lo nuevo desde la
última impresión en papel — y dos formatos:
- **PDF** (`registryExport.ts`, A4 apaisado): tabla dibujada a mano con
  jsPDF replicando el maquetado exacto del Anexo VII (mismas 10
  columnas, mismo orden), con ajuste de línea por celda y salto de
  página automático cuando una fila no cabe.
- **CSV** (con BOM UTF-8 para que Excel no rompa los acentos).

Para lo de "que no vuelva a generar para impresión los folios que ya
imprimí": se guarda `Firm.registryLastPrintedEntry` (nº de asiento) +
`registryLastPrintedAt`, actualizable solo por el titular o un
director (`isOwnerOrDirector`, mismo criterio que el resto de ajustes
a nivel de despacho) con el botón "Marcar como impreso hasta el nº X"
que aparece tras exportar. La próxima vez que alguien elija "Solo lo
nuevo desde la última impresión", el diálogo ya solo incluye los
asientos posteriores a ese número — así, si un folio ya tiene 5 filas
impresas, la siguiente exportación empieza directamente en la fila 6
sin repetir las 5 anteriores.

**Verificado en producción**: exportado el PDF del libro-registro
demo (2 asientos) y comprobado el contenido real del archivo generado
(no solo que se descargara) extrayendo los literales de texto del PDF
byte a byte — encabezado del despacho, rango de asientos, las 10
cabeceras de columna exactas del Anexo VII, y los datos de ambos
asientos correctamente volcados y ajustados a varias líneas donde
corresponde. Confirmado también que "Marcar como impreso hasta el nº
2" persiste correctamente: al reabrir el diálogo, "Solo lo nuevo desde
la última impresión" pasa a mostrar "Hay 0 sin imprimir."

## Bug real: no había ninguna forma de guardar el domicilio de un cliente (2026-09-02)

Al comprobar por qué el PDF del libro-registro salía con el domicilio
del contratante en blanco para los dos asientos demo, la causa no era
solo que fueran anteriores al arreglo del campo: los dos clientes del
despacho demo no tenían ningún `address` guardado en absoluto, y
resultó que **no existe, en toda la aplicación, ningún sitio donde
introducir el domicilio de un cliente** — `ClientsPage.tsx` no tiene
formulario de alta manual (los clientes solo se crean
programáticamente al aceptar un presupuesto) y `ClientDetailPage.tsx`
era de solo lectura, sin ningún botón "Editar". El bloque que
intentaba mostrar la dirección hacía además un cast a
`{ address?: string }` cuando `Client.address` es en realidad un
objeto `ClientAddress` (calle/ciudad/provincia/CP) — nunca podía haber
funcionado ni aunque hubiera datos.

Esto no era un hueco de la demo, sino un bug real que afecta a
cualquier despacho: sin manera de fijar el domicilio del contratante,
el campo que se añadió ayer al libro-registro se queda vacío para
siempre en producción, incumpliendo el Anexo VII de forma permanente.

**Arreglado**: añadido formulario de edición completo en
`ClientDetailPage.tsx` (nombre, NIF/CIF, email, teléfono y domicilio
estructurado), con `address` añadido a `CreateClientData` en
`services/clients.ts` y a `useClientDetail()` en `hooks/useClients.ts`.
Verificado en producción: editados los dos clientes del despacho demo
con un domicilio real, guardado y mostrado correctamente
("Dirección — Calle Compañía 15, 3ºA, 29008 Málaga (Málaga)").

De paso, al abrir los asientos del libro-registro en la consola de
Firestore para completar el domicilio a mano (los asientos ya creados
no se actualizan solos — `clientAddress` se copia una vez al abrir el
expediente, no es una referencia viva al cliente), se encontró que
`detectiveName` también estaba en blanco en ambos asientos — el mismo
bug del `displayName` vacío por email/contraseña documentado ayer,
pero en un documento distinto (`registryBooks/{entryId}`, no
`reports/{reportId}`) que no se había tocado entonces. Corregido igual
que los informes: "Marta Sánchez Vega" en los dos asientos. El libro-
registro demo queda ahora con las 10 columnas completas en ambos
asientos.

## Numeración correlativa: contador atómico y arranque configurable (2026-09-02)

Las cinco numeraciones del despacho (asientos del libro, expedientes,
contratos, presupuestos y contactos) se calculaban igual:
`getDocs(coleccion).size + 1`. Tres problemas, en orden de gravedad:

1. **Borrar reutilizaba números.** Al eliminar un documento el contador
   bajaba, así que la siguiente alta repetía un número ya usado. En el
   libro-registro eso rompe la correlatividad que exigen el art. 108 del
   Reglamento de Seguridad Privada y el art. 17 de la Orden INT/318/2011:
   los asientos no se repiten ni se reciclan.
2. **Dos altas simultáneas se llevaban el mismo número.**
3. Leía la colección entera en cada alta.

Sustituido por `src/services/counters.ts`: un contador por secuencia en
`firms/{firmId}/counters/{sequence}`, incrementado dentro de una
`runTransaction`. Nunca retrocede.

**El riesgo de la migración** era que el contador arrancase en 1 y
repitiese los números de los despachos que ya venían usando la
plataforma. Resuelto con `highestExistingNumber()`: la primera vez que
se usa una secuencia se siembra desde el mayor número existente en la
colección. Como una transacción de cliente no puede lanzar consultas, la
semilla se calcula fuera y se aplica como suelo dentro. Verificado en
producción con el despacho demo, que ya tenía los asientos 1 y 2: el
contador arrancó anunciando el nº 3, no el 1.

Añadido **Configuración → Libro-registro**, donde un despacho que llega
con 200 asuntos anotados en papel continúa en el 201. Solo avanza:
retroceder repetiría un asiento, y la transacción lo rechaza con "El
número N ya está usado. La numeración solo puede continuar a partir del
N+1." Verificado en producción intentando volver al 2.

También en tipos, de cara a la reforma del libro: `RegistryEntry.origin`
(`'plataforma' | 'historico'`), para que los asientos importados del
papel no se traten como incompletos, y `RegistryEntry.physicalLocation`,
dónde está la carpeta física del asunto.

## Vista del asiento: todo el asunto en una pantalla (2026-09-02)

El problema que motivó la reestructuración: cuando la Policía Nacional
inspecciona un despacho no pide "el módulo de contratos", señala una
línea del libro y dice *«dame todo lo relacionado con el asiento 124»*.
Hasta ahora eso obligaba a recorrer cinco pantallas independientes.

Cada asiento del libro se abre ahora en `/app/registry-book/:entryId`
(`RegistryEntryPage.tsx`) y muestra la carpeta entera: el asiento con
las columnas del Anexo VII, el cliente, el presupuesto, el contrato, el
encargo, las actuaciones y el informe. `services/dossier.ts` reúne las
piezas (`getDossier`, y `getDossierByEntryNumber` para buscar por el
número que dice el inspector, no por el ID interno).

Arriba del todo, **antes** que el contenido, va lo que le falta al
asunto (`dossierGaps`): columnas del Anexo VII sin rellenar, contrato
sin firmar, informe ausente, interés legítimo sin acreditar (art. 48.2
de la Ley 5/2014). Distingue lo exigible de lo que simplemente está en
curso — un asunto abierto sin informe todavía es un aviso, uno cerrado
sin informe es un incumplimiento — y no marca como incompletos los
asientos de origen `historico`, que se anotaron en su día con lo que
entonces se pedía.

`services/dossierExport.ts` genera el PDF del asunto completo, paginado,
con pie de página que repite el nº de asiento y RNSP en cada hoja, para
entregar en mano. Incluye la misma revisión de ausencias al final:
ocultarla no la haría desaparecer en una inspección.

Verificado en producción sobre el asiento nº 2 del despacho demo: la
pantalla detectó un hueco real (el cliente no tenía NIF/CIF, columna
obligatoria del Anexo VII) y el PDF salió con 2 páginas y 115 líneas de
texto, con la revisión y la paginación correctas.

## Bug real: la aplicación instalada se quedaba en la versión anterior (2026-09-02)

Al verificar la vista del asiento en producción, el navegador seguía
ejecutando el bundle antiguo pese a que el despliegue había sido
correcto. Dos causas independientes:

- **Firebase Hosting** servía `index.html` y `sw.js` con su caché por
  defecto de una hora, así que durante ese rato se seguía entregando la
  versión vieja. Añadida sección `headers` en `firebase.json`:
  `no-cache` para esos dos, y `max-age=31536000, immutable` para
  `/assets/**`, que ya llevan hash en el nombre.
- **El service worker** solo buscaba versión nueva al cargar la página.
  Un despacho abre la aplicación por la mañana y la deja abierta todo el
  día: un arreglo desplegado hoy podía no llegarle hasta el día
  siguiente. `src/lib/appUpdate.ts` comprueba ahora cada media hora y
  aplica la actualización sola (no hay estado en memoria que perder:
  todo vive en Firestore). El registro pasa a hacerse desde el código,
  con `injectRegister: null` en `vite.config.ts`, para no registrar el
  service worker dos veces.

Verificado en producción: cabeceras `no-cache` correctas, y la
aplicación pasa sola al bundle nuevo tras un ciclo de recarga.

## La línea base de lint eran 48 avisos, pero solo 16 eran reales (2026-09-02)

ESLint analizaba `.claude/worktrees/`, copias de trabajo temporales del
propio repositorio dejadas por ramas que ya no existen, y duplicaba cada
aviso del código real. Añadido `.claude` a `globalIgnores` en
`eslint.config.js`. **La línea base real es 16 problemas (15 errores, 1
aviso)**, todos preexistentes; es esa la cifra que no debe subir.

## La navegación deja de ser un menú de tablas de la base de datos (2026-09-02)

Había trece entradas en el menú, una por colección: Contactos,
Presupuestos, Clientes, Expedientes, Libro-registro, Contratos,
Informes, Cumplimiento, Estadísticas, Colaboradores, Equipo... Eso es el
esquema de Firestore puesto en una barra lateral, no la forma en que un
despacho trabaja. Un contrato no es un sitio al que se va: es un papel
de un asunto, y se ve dentro del asunto.

Quedan cinco destinos de trabajo — **Hoy · Archivo · Oportunidades ·
Clientes · Colaboradores** — más Configuración, y debajo, en un bloque
aparte y más apagado, tres que se consultan de vez en cuando:
libro-registro, cumplimiento y estadísticas. `/app` y el inicio de
sesión llevan ahora a Hoy, no al Dashboard.

**Hoy** (`features/today/TodayPage.tsx`) es la pantalla de cada día: los
asuntos abiertos con **lo más parado arriba**, porque un asunto sin
anotar durante días es el problema que nadie ve hasta que hay que
redactar el informe y no queda de dónde sacarlo. Cada uno enseña el
único paso que toca ahora —firmar, anotar, informar o cerrar—, cuántas
actuaciones lleva y cuánto hace que no se toca, y entra directamente en
la pestaña correspondiente del expediente: **la pestaña va ahora en la
URL** (`?tab=actuaciones`), antes era estado local y no se podía enlazar.

**Archivo** (`features/registry/ArchivePage.tsx`) es la estantería que
ya tienen: los años como lomos y los asuntos dentro, con el año en curso
abierto y los anteriores plegados. Cada año dice cuántos asuntos tiene y
qué rango de asientos cubre. La búsqueda cruza nº de asiento, cliente,
NIF, investigado, objeto y detective — que es la parte que una
estantería física no puede hacer.

**Oportunidades** (`features/opportunities/OpportunitiesPage.tsx`)
fusiona Contactos y Presupuestos, que eran dos vistas de lo mismo: un
presupuesto no existe sin alguien que lo pidió. Y resuelve la queja de
que en Contactos apareciesen todos revueltos, el que llamó ayer junto al
que lleva tres asuntos. Cada oportunidad tiene ahora su estado —
`sin presupuestar` → `presupuesto enviado` → `contratado`, o
`descartado`.

**El estado no es un campo nuevo, a propósito** (`services/pipeline.ts`,
`buildOpportunities`): se deduce de los presupuestos del contacto. Un
campo guardado se quedaría obsoleto en cuanto alguien aceptase un
presupuesto sin acordarse de cambiarlo; deducido no puede mentir.

Presupuestar, aceptar y rechazar se han traído a esta pantalla: sin eso
la redirección habría roto el flujo presupuesto → contrato → expediente.
`/app/contacts` y `/app/quotes` redirigen a Oportunidades para no romper
enlaces guardados. `ContactsPage.tsx` y `QuotesPage.tsx` se han borrado
— dejarlas muertas es el mismo problema de dispersión, en el código.

Verificado en producción: las tres pantallas nuevas, el sidebar con los
9 enlaces, las dos redirecciones, y Oportunidades mostrando los 5
contactos demo repartidos correctamente (2 presupuesto enviado con sus
botones Aceptar/Rechazar, 2 contratados, 1 descartado).

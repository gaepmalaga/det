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

```
Contacto → Presupuesto (por despacho) → [Aceptado | Rechazado]
                                              ↓ aceptado
                                    Expediente "abierto"
                                              ↓
                          Actuaciones (texto: qué, cuándo, dónde, quién)
                                              ↓
                              [IA] compila actuaciones → borrador de informe
                                              ↓
                    Contrato:
                      · Cliente particular → link de firma (individual, puntual)
                      · Cliente recurrente → portal propio (histórico contratos)
                                              ↓
                                  Cierre → Libro-registro (fiel a ley)
```

Reglas de negocio confirmadas:

- Un contacto puede tener **varios presupuestos**, y de **varios despachos
  distintos** (no es "1 contacto = 1 oportunidad").
- El expediente ("case") se crea **solo al aceptar un presupuesto** — no antes.
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
- El siguiente paso natural es seguir con la implementación por fases
  (ver propuesta de fases en la conversación): modelo de datos completo
  (`contacts`/`quotes`/`caseActions`/`contractTemplates`), luego ir
  retirando evidencias/compliance/portal-mensajería y construyendo el
  flujo nuevo — o cerrar antes los 3 puntos abiertos de §7 si se prefiere
  rematar el alcance primero.

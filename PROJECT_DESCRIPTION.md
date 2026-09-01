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

Pendiente de afinar (no cerrado): opciones de exportación para que cada
despacho lo ponga en su propia plantilla con logo, etc.

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

Pendiente de decidir: mecanismo exacto de invitación por email para el
colaborador con plataforma (link → crea cuenta con acceso restringido) frente
a alta manual por el titular — no se ha cerrado del todo, aunque la
distinción por `tienePlataforma` sí queda fijada.

### 4.6 Cliente esporádico vs. habitual (mutuas, aseguradoras, empresas)

Sigue **abierto**. La duda de fondo: si un cliente habitual firma un contrato
marco una vez (cubre todos sus casos futuros, sin fricción) o si sigue
firmando contrato en cada expediente igual que un particular, y lo único que
cambia es que tiene portal.

**Decidido**: si hay contrato marco activo, el expediente se abre directamente
sin pasar por `quotes` (las condiciones económicas ya están pactadas en el
marco), pero sí se registra una cifra por asunto para control interno —
como campos directos en `cases` (`agreedAmount`, `billingMode: 'quote' |
'framework'`), no como una colección de contabilidad aparte. Detalle en §7.

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
investigación. **No está reflejado todavía en el flujo propuesto** (§3) —
habría que añadir un campo obligatorio "interés legítimo alegado" al aceptar
el presupuesto/abrir expediente, no solo el objeto de la investigación.

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

**Gap detectado contra el modelo actual** (`RegistryEntry` en
`src/types/index.ts:350`): el tipo existente tiene `entryNumber`,
`entryDate`, `clientName`, `clientTaxId`, `investigationObject`,
`detectiveName`, `detectiveTip`, `startDate`, `endDate`, `status`,
`amendments` — pero **le faltan 4 campos que exige la ley explícitamente**:
nombre y domicilio del **investigado**, y **delitos perseguibles de oficio
conocidos + órgano al que se comunicaron** (relevante porque el Art. 37.4
obliga a los detectives a denunciar estos delitos si los detectan, aunque no
puedan investigarlos ellos mismos). Hay que añadirlos al modelo nuevo de
`registryBooks`.

### TIP (Tarjeta de Identidad Profesional)

Coincide con el número de DNI del detective — no es un código aparte que haya
que generar, solo capturarlo. Es personal e intransferible.

## 7. Decisiones recientes y abierto / sin decidir todavía

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

### Sin decidir todavía

1. **Invitación de colaborador con plataforma** — mecanismo exacto (email con
   link de auto-registro vs. alta manual por el titular).
2. **Exportación del informe** — formatos, plantilla con logo del despacho,
   qué tan editable es la maquetación final.
3. **Contrato marco de cliente habitual** — quién lo redacta (parece que en
   algunos casos lo aportan los propios abogados del cliente, no el despacho),
   y cómo se sube/adjunta frente a generarse desde plantilla.

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
- Nada de lo descrito en este documento (§1-§7) está implementado todavía —
  es una fase de definición de alcance. El siguiente paso natural es cerrar
  los puntos abiertos de §7 y planificar la implementación (probablemente
  empezando por el modelo de datos de §5 con las correcciones de §6).

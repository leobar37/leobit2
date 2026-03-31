# Plan: Análisis y Extracción de Cuadernos de Ventas desde Imágenes

## Objective

Diseñar un flujo de análisis durable para procesar las imágenes manuscritas en `data-avileo/JUAVIK/`, extraer por imagen un JSON estructurado línea por línea, repetir la extracción dos veces para corroboración, capturar abreviaturas de negocio como `xy = por yapear`, y dejar preparada una base confiable para luego convertir ese material en clientes, ventas, abonos, pagos y saldos compatibles con Avileo.

## Scope

- In scope: definir la estructura de carpetas de trabajo para este lote de imágenes, el contrato JSON por imagen, el diccionario inicial de abreviaturas, el flujo de doble extracción y reconciliación, la clasificación de líneas manuscritas, la detección de similitudes entre nombres/productos, y la estrategia de validación/manual QA antes de importar a entidades de Avileo.
- Out of scope: implementar OCR productivo, modificar rutas/backend/frontend existentes, crear migraciones de base de datos, importar definitivamente los cuadernos a tablas `customers`, `sales` o `abonos`, o cambiar el OCR actual de balanza.

## Verified Context

- **Verified:** el lote de trabajo ya existe en `data-avileo/JUAVIK/` y contiene 100 imágenes `.jpg` del cuaderno (`Cuaderno Tanchy_1.jpg` ... `Cuaderno Tanchy_100.jpg`).
- **Verified:** las primeras imágenes muestran fechas manuscritas y listas de clientes con montos, subtotales y marcas como `+`, `x 10.5`, `1/2`, `1/4`, `P`, `H`, y notas como `xy`, lo que confirma que el problema es de parsing semiestructurado y no de formularios uniformes.
- **Verified:** al revisar imágenes adicionales (`Cuaderno Tanchy_4.jpg`, `Cuaderno Tanchy_5.jpg`, `Cuaderno Tanchy_6.jpg`) aparecen nuevos patrones importantes: páginas sin fecha explícita al inicio, una nueva fecha que puede arrancar a mitad de página (`Martes 10-2-26`), anotaciones de continuidad como `pago anterior`, `actual 88.2`, montos encerrados en círculo, y marcas explícitas como `yapeo`/`yapco`, no solo `xy`.
- **Verified:** varias páginas reutilizan nombres de clientes entre días y muestran estructura de libreta corrida más que páginas independientes; esto sugiere continuidad temporal y necesidad de modelar bloques por fecha dentro de una misma imagen.
- **Verified:** algunas líneas incluyen múltiples componentes de pedido o cálculo en la misma entrada (por ejemplo sumas como `17.6 + 19.8 + 10.5`, referencias a `arroz`, `aceit`, `2 casill`, `pollo`, `gallina`, `hvs/huevos`), por lo que una línea no siempre se reduce a un único `pedido + precio + total`.
- **Verified (user-confirmed):** `yapeo` significa que el cliente sí pagó con Yape.
- **Verified (user-confirmed):** `xyapear` / `x yapear` indica que la venta queda debida o pendiente de pago por Yape.
- **Verified (user-confirmed):** `NP` significa `no pago`.
- **Verified (user-confirmed):** texto o marcas fuera de la línea principal deben ignorarse por defecto.
- **Verified:** el OCR actual del backend está limitado a balanzas digitales: `packages/backend/src/api/ocr.ts` expone solo `POST /ocr/recognize-weight` y `packages/backend/src/services/business/ocr.service.ts` devuelve únicamente `bruto`, `tara`, `precioPorKg`, `precioTotal`, `confianza` y `notas`.
- **Verified:** el backend ya tiene modelos compatibles con el dominio objetivo: `packages/backend/src/db/schema/customers.ts` define clientes; `packages/backend/src/db/schema/sales.ts` define ventas con `saleType`, `paymentMode`, `totalAmount`, `amountPaid`, `balanceDue`; `packages/backend/src/db/schema/payments.ts` define `abonos` con `amount`, `paymentMethod`, `referenceNumber`, `notes`.
- **Verified:** los métodos de pago admitidos por el sistema incluyen `efectivo`, `yape`, `plin`, `transferencia`, `tarjeta`, `saldo` en `packages/backend/src/db/schema/enums.ts`.
- **Verified:** el frontend local-first también modela `abonos` y cálculo de deuda en `packages/app/app/engine/db.ts` y `packages/app/app/lib/services/payment-service.ts`.
- **Verified:** el repositorio ya calcula cuentas por cobrar usando ventas a crédito menos abonos en `packages/backend/src/services/repository/customer.repository.ts`, y el frontend tiene reporte en `packages/app/app/routes/_protected.reportes.cuentas-por-cobrar.tsx`.
- **Verified:** la documentación del proyecto reconoce explícitamente que el negocio hoy maneja cuentas por cobrar en libretas de papel (`docs/technical/readme.md`, `docs/development/05-customers-payments/readme.md`).

## Assumptions

- **Inferred:** este trabajo debe arrancar como un pipeline de análisis fuera del flujo normal de ventas, usando archivos en `data-avileo/`, porque el OCR actual no sirve para cuadernos manuscritos.
- **Inferred:** una línea manuscrita puede representar una venta, un abono, un saldo, una anotación de método de pago o una nota contextual; incluso puede contener más de una entidad de negocio dentro de la misma línea. Por eso el JSON debe guardar clasificación y evidencia, no solo valores finales.
- **Inferred:** la doble extracción por imagen debe ejecutarse con el mismo contrato de salida pero en dos pasadas independientes (`pass-1` y `pass-2`) para medir consistencia antes de aceptar datos.
- **Verified (user-confirmed):** debe distinguirse entre `yapeo = pago realizado por Yape` y `xyapear/x yapear = deuda pendiente por cobrar vía Yape`.
- **Inferred:** nombres como `Pamylo`, `Panylo`, `Blady/Glady`, etc., requerirán una capa de normalización posterior y no deben forzarse prematuramente al catálogo `customers`.
- **Inferred:** símbolos o sufijos como `P`, montos circulados y flechas (`>`) parecen operar como marcadores de estado, resultado o saldo, y no solo como parte del cálculo aritmético.
- **Unknown:** no está confirmado si todos los montos con `+` son abonos, acumulados, saldos previos o ajustes.
- **Unknown:** no está confirmado si `P`, `H`, `CH`, `pollo`, `gall`, `criolla`, `menud` representan productos, presentaciones o unidades de cobro en todos los casos.
- **Unknown:** no está confirmado cuándo un monto circulado representa saldo pendiente, pago recibido, monto destacado para revisión o cierre de cuenta.

## Files Involved

- `data-avileo/JUAVIK/` - Review - lote fuente de imágenes manuscritas a procesar.
- `data-avileo/README.md` - Create - instrucciones operativas del lote, convenciones y advertencias para evitar errores humanos.
- `data-avileo/instructions/notebook-extraction-guidelines.md` - Create - guía de anotación: cómo leer una línea, cómo clasificarla y cómo tratar abreviaturas ambiguas.
- `data-avileo/instructions/notebook-abbreviations.json` - Create - diccionario controlado de abreviaturas, símbolos y equivalencias iniciales como `yapeo -> pago por Yape`, `xyapear/x yapear -> deuda pendiente por Yape`, `NP -> no pago`.
- `data-avileo/instructions/notebook-json-schema.json` - Create - contrato JSON por imagen y por línea para ambas pasadas.
- `data-avileo/instructions/notebook-line-patterns.md` - Create - inventario vivo de patrones reales observados en el cuaderno con ejemplos visuales/textuales y su interpretación tentativa.
- `data-avileo/extractions/JUAVIK/pass-1/` - Create - salida JSON de la primera extracción por imagen.
- `data-avileo/extractions/JUAVIK/pass-2/` - Create - salida JSON de la segunda extracción por imagen.
- `data-avileo/extractions/JUAVIK/reconciled/` - Create - JSON reconciliado por imagen con diferencias explícitas.
- `data-avileo/extractions/JUAVIK/reports/` - Create - métricas de calidad, conflictos y cobertura del lote.
- `packages/backend/src/services/business/ocr.service.ts` - Review - referencia de patrón actual de prompt/JSON, solo para contrastar limitaciones del OCR existente.
- `packages/backend/src/api/ocr.ts` - Review - confirma que hoy no existe endpoint para cuadernos manuscritos.
- `packages/backend/src/db/schema/customers.ts` - Review - referencia para futura normalización a clientes.
- `packages/backend/src/db/schema/sales.ts` - Review - referencia para mapear líneas de venta a `sales` y `sale_items`.
- `packages/backend/src/db/schema/payments.ts` - Review - referencia para mapear pagos/abonos y evidencias de pago.
- `packages/backend/src/db/schema/enums.ts` - Review - catálogo de métodos de pago válidos para hints como `yape`.
- `packages/backend/src/services/repository/customer.repository.ts` - Review - referencia del cálculo de deuda y cuentas por cobrar que debe respetar la futura importación.
- `packages/app/app/lib/services/payment-service.ts` - Review - referencia local-first para validación de deuda y abonos.
- `packages/app/app/routes/_protected.reportes.cuentas-por-cobrar.tsx` - Review - pantalla objetivo que luego debería reflejar correctamente los datos importados.

## Ordered Execution Steps

1. **Definir el workspace documental del lote**
   - Files: `data-avileo/README.md`, `data-avileo/JUAVIK/`
   - Action: documentar que `data-avileo/JUAVIK/` es el dataset fuente, que no se deben sobrescribir imágenes originales, cómo nombrar salidas derivadas y qué carpetas se usarán para extracción, reconciliación y reportes.
   - Depends on: none

2. **Diseñar las instrucciones de lectura y clasificación de líneas**
   - Files: `data-avileo/instructions/notebook-extraction-guidelines.md`
   - Action: definir reglas para detectar fecha, delimitar bloques, interpretar una línea manuscrita, distinguir `cliente`, `pedido`, `precio`, `total`, `debe`, `pago`, `yapeo`, `nota`, y cómo registrar incertidumbre cuando la escritura no sea concluyente. Incluir explícitamente casos donde la fecha aparece a mitad de página y la imagen contiene más de un bloque temporal. Establecer que texto o marcas fuera de la línea principal se ignoran por defecto. También definir cuándo una línea debe partirse en múltiples `entries[]`.
   - Depends on: 1

3. **Definir el diccionario inicial de abreviaturas y símbolos**
   - Files: `data-avileo/instructions/notebook-abbreviations.json`, `data-avileo/instructions/notebook-extraction-guidelines.md`
   - Action: crear un catálogo editable con entradas como `xyapear`, `x yapear`, `yapeo`, `yapco`, `x`, `+`, `1/2`, `1/4`, `P`, `H`, `CH`, `ND`, `NP`, `>`, montos circulados y notas tipo `pago anterior` / `actual`, incluyendo significado confirmado o tentativo, nivel de confianza y si la marca afecta precio, pago, producto, arrastre de saldo o estado de deuda.
   - Depends on: 2

4. **Definir el contrato JSON por imagen y por línea**
   - Files: `data-avileo/instructions/notebook-json-schema.json`
   - Action: especificar un JSON que permita guardar por imagen: metadatos del archivo, fechas detectadas, bloques por fecha, líneas extraídas, texto crudo, tipo de línea como contenedor, `entries[]` de negocio dentro de cada línea, cliente crudo, cliente normalizado tentativo, `items[]` o componentes de pedido, operaciones aritméticas detectadas, precio, total, deuda, pago, `paymentMethod`, `paymentStatus`, `pendingYape`, `carryOverFromPrevious`, `referencesPreviousPayment`, `ignoredDetachedText`, notas, confianza y banderas de revisión.
   - Depends on: 2, 3

## Minimum JSON Schema Per Image

```json
{
  "imageId": "cuaderno-tanchy-4",
  "imageFile": "Cuaderno Tanchy_4.jpg",
  "sourceDataset": "data-avileo/JUAVIK",
  "pass": "pass-1",
  "extractedAt": "2026-03-28T00:00:00.000Z",
  "schemaVersion": "1.0.0",
  "imageLevelNotes": [],
  "ignoredDetachedText": [
    {
      "rawText": "texto fuera de linea",
      "reason": "outside-main-line"
    }
  ],
  "detectedDates": [
    {
      "rawText": "Martes 10-2-26",
      "normalizedDate": "2026-02-10",
      "confidence": 0.94
    }
  ],
  "blocks": [
    {
      "blockIndex": 0,
      "date": {
        "rawText": "Martes 10-2-26",
        "normalizedDate": "2026-02-10",
        "inheritedFromPreviousBlock": false,
        "confidence": 0.94
      },
      "blockNotes": [],
      "lines": [
        {
          "lineIndex": 0,
          "rawLineText": "Manuela x10.8 = 26.5 + 20.7P",
          "lineType": "multi_entry_line",
          "customer": {
            "rawName": "Manuela",
            "normalizedCandidate": "Manuela",
            "similarTo": [],
            "confidence": 0.98
          },
          "entries": [
            {
              "entryIndex": 0,
              "entryType": "sale",
              "description": "primary sale fragment",
              "customerRef": "Manuela",
              "amount": 26.5,
              "paymentMethod": null,
              "paymentStatus": "unknown",
              "confidence": 0.78
            },
            {
              "entryIndex": 1,
              "entryType": "balance_reference",
              "description": "highlighted trailing amount",
              "customerRef": "Manuela",
              "amount": 20.7,
              "paymentMethod": null,
              "paymentStatus": "unknown",
              "confidence": 0.55
            }
          ],
          "items": [
            {
              "rawText": "x10.8",
              "normalizedProductCandidate": null,
              "similarTo": [],
              "quantityText": null,
              "unitPrice": 10.8,
              "lineAmount": 26.5,
              "confidence": 0.72
            }
          ],
          "operations": [
            {
              "rawText": "26.5 + 20.7",
              "operator": "+",
              "operands": [26.5, 20.7],
              "result": null,
              "confidence": 0.7
            }
          ],
          "amounts": {
            "subtotal": 26.5,
            "total": null,
            "amountPaid": null,
            "balanceDue": null,
            "highlightedAmount": 20.7
          },
          "payment": {
            "paymentMethod": null,
            "paymentStatus": "unknown",
            "yapeoConfirmed": false,
            "pendingYape": false,
            "noPago": false,
            "referencesPreviousPayment": false,
            "carryOverFromPrevious": false
          },
          "markers": {
            "hasCircledAmount": false,
            "hasArrow": false,
            "hasP": true,
            "hasNP": false,
            "hasYapeo": false,
            "hasXYapear": false
          },
          "reviewFlags": [],
          "notes": [],
          "confidence": 0.79
        }
      ]
    }
  ]
}
```

### Required fields

- Top-level required: `imageId`, `imageFile`, `sourceDataset`, `pass`, `schemaVersion`, `blocks`
- Block-level required: `blockIndex`, `date`, `lines`
- Line-level required: `lineIndex`, `rawLineText`, `lineType`, `entries`, `customer`, `items`, `operations`, `amounts`, `payment`, `markers`, `reviewFlags`, `confidence`

### Required lineType values (container-level)

- `single_entry_line`
- `multi_entry_line`
- `carry_over_line`
- `date_header_line`
- `note_only_line`
- `unknown_line`

### Required entryType values (business-level)

- `sale`
- `payment_confirmed`
- `pending_yape_payment`
- `no_payment_marker`
- `balance_reference`
- `previous_payment_reference`
- `product_fragment`
- `unknown_entry`

### Required payment semantics

- `payment.paymentMethod = "yape"` and `payment.yapeoConfirmed = true` when the line explicitly says `yapeo`
- `payment.pendingYape = true` when the line says `xyapear` or `x yapear`
- `payment.noPago = true` when the line says `NP`
- `payment.paymentStatus` should use only: `paid`, `pending_yape`, `no_pago`, `partial`, `unknown`

### Required entry splitting rules

- If a single physical line contains two or more business meanings, it must stay as one `rawLineText` but be split into multiple `entries[]`.
- Do not auto-merge two detected amounts into one sale unless the handwriting clearly expresses a single combined total.
- If one pass detects one entry and the other detects two or more entries, that must be treated as a structural reconciliation conflict.
- `lineType` describes the notebook line as a container; `entryType` describes each business event found inside it.

### Required line parsing rules

- Ignore text outside the main line by default and store it only in `ignoredDetachedText` when it is intentionally discarded.
- Preserve `rawLineText` exactly as read before any normalization.
- If a line has multiple product fragments or multiple sums, keep them in `items[]` and `operations[]`; do not collapse them prematurely.
- If a line contains more than one business event, split it into `entries[]` without losing the original `rawLineText`.
- Similarity detection must not overwrite the raw text; it only enriches `normalizedCandidate` and `similarTo[]`.
- If a line references `pago anterior` or `actual`, keep that information inside `payment.referencesPreviousPayment` or `payment.carryOverFromPrevious` plus `notes[]`.

5. **Definir detección de similitudes para clientes y productos**
   - Files: `data-avileo/instructions/notebook-extraction-guidelines.md`, `data-avileo/instructions/notebook-abbreviations.json`, `data-avileo/instructions/notebook-json-schema.json`
   - Action: establecer una capa de similitud para agrupar variantes manuscritas de clientes y productos sin fusionarlas automáticamente. Guardar `rawValue`, `normalizedCandidate`, `similarTo[]` y nivel de confianza para casos como `Blady/Glady`, `hvs/huevos`, `aceit/aceite`.
   - Depends on: 3, 4

6. **Crear un inventario explícito de patrones reales observados**
   - Files: `data-avileo/instructions/notebook-line-patterns.md`, `data-avileo/JUAVIK/`
   - Action: documentar ejemplos concretos del lote: encabezado con fecha, bloque continuado desde página previa, línea con `pago anterior`, línea con `actual`, línea con monto circulado, línea con `xyapear/yapeo`, línea con varios items o sumas en la misma entrada, línea con `NP = no pago`, y línea que deba separarse en dos o más `entries[]`.
   - Depends on: 2, 3, 4, 5

7. **Separar el flujo en doble extracción independiente**
   - Files: `data-avileo/extractions/JUAVIK/pass-1/`, `data-avileo/extractions/JUAVIK/pass-2/`, `data-avileo/instructions/notebook-json-schema.json`
   - Action: establecer que cada imagen genere dos JSON paralelos con el mismo schema, sin reutilizar directamente resultados de la primera pasada, para minimizar sesgos y permitir verificación cruzada por imagen.
   - Depends on: 4, 5, 6

8. **Diseñar el modelo de reconciliación entre ambas pasadas**
   - Files: `data-avileo/extractions/JUAVIK/reconciled/`, `data-avileo/extractions/JUAVIK/reports/`
   - Action: definir cómo comparar `pass-1` vs `pass-2` por imagen y por línea, qué campos deben coincidir exactamente (`image`, `blockIndex`, `lineIndex`, `lineType`), cuáles admiten tolerancias (`amount`, `price`, `customerName`), y cómo registrar conflictos para revisión manual. Incluir conflictos estructurales como desacuerdo sobre cambio de fecha dentro de la imagen, sobre si una línea es arrastre de saldo versus venta nueva, o sobre cuántas `entries[]` existen dentro de una misma línea.
   - Depends on: 7

9. **Diseñar el esquema de clasificación semántica hacia Avileo**
   - Files: `data-avileo/instructions/notebook-extraction-guidelines.md`, `packages/backend/src/db/schema/customers.ts`, `packages/backend/src/db/schema/sales.ts`, `packages/backend/src/db/schema/payments.ts`, `packages/backend/src/db/schema/enums.ts`
   - Action: mapear cada `entryType` del cuaderno hacia el dominio de Avileo: venta al crédito o contado, abono, pago confirmado por Yape (`yapeo`), deuda pendiente por cobrar vía Yape (`xyapear/x yapear`), saldo pendiente, arrastre desde página previa, referencia de pago anterior, nota no importable. `lineType` debe usarse solo como contexto estructural del cuaderno y no como sustituto del evento de negocio final.
   - Depends on: 4, 8

10. **Definir la estrategia de normalización de clientes, productos y fechas**
   - Files: `data-avileo/instructions/notebook-extraction-guidelines.md`, `packages/backend/src/db/schema/customers.ts`
   - Action: establecer reglas para conservar `rawCustomerName`, proponer `normalizedCustomerName`, evitar merges automáticos agresivos, tratar fechas parciales o encabezados compartidos entre páginas consecutivas, marcar clientes recurrentes entre bloques sin asumir equivalencia perfecta, y conservar también `rawProductText` + `normalizedProductCandidate` para productos similares.
   - Depends on: 9

11. **Definir la estrategia de QA manual y métricas de calidad**
   - Files: `data-avileo/extractions/JUAVIK/reports/`, `data-avileo/README.md`
   - Action: documentar métricas mínimas por lote: porcentaje de imágenes con fecha detectada, porcentaje de bloques por fecha correctamente delimitados, porcentaje de líneas reconciliadas, conflictos por abreviatura, líneas sin cliente identificable, líneas con arrastre de saldo, y criterios para aceptar/rechazar una imagen antes de usarla como insumo de importación.
   - Depends on: 8, 10

12. **Delimitar la futura integración con producto sin ejecutarla todavía**
   - Files: `packages/backend/src/api/ocr.ts`, `packages/backend/src/services/business/ocr.service.ts`, `packages/backend/src/services/repository/customer.repository.ts`, `packages/app/app/lib/services/payment-service.ts`, `packages/app/app/routes/_protected.reportes.cuentas-por-cobrar.tsx`
   - Action: dejar en el plan qué partes del sistema serían consumidoras de la data depurada en una fase posterior, aclarando que esta etapa solo produce un dataset confiable e inspeccionable y no modifica los flujos actuales de OCR, ventas o abonos.
   - Depends on: 9, 10, 11

## Risks and Edge Cases

- La escritura cambia mucho entre páginas, por lo que una regla válida para una imagen puede fallar en la siguiente.
- Una misma línea puede mezclar cliente, subtotal, pago parcial y nota marginal, dificultando un parseo determinista.
- Una misma línea puede contener dos o más ventas, o una venta más una referencia de saldo/pago, por lo que `lineType` por sí solo no basta para representar el negocio.
- Una misma imagen puede contener el cierre de un día y el inicio de otro, por lo que `image != fecha única`.
- La fecha puede aparecer una sola vez y aplicar a múltiples bloques o páginas; si se pierde ese contexto, se distorsiona toda la extracción.
- Símbolos como `+`, `x`, `>`, `P`, `H`, `CH`, `ND`, `NP` pueden significar cosas distintas según el contexto de la línea.
- Expresiones como `pago anterior`, `actual`, montos circulados o flechas pueden representar arrastre de saldo y no deben confundirse con ventas nuevas.
- `xyapear/x yapear` debe tratarse como deuda pendiente por Yape, mientras `yapeo` sí representa pago realizado por Yape.
- Los nombres pueden venir truncados, con apodos o grafías inconsistentes, generando falsos positivos al normalizar clientes.
- Los productos también pueden aparecer truncados o abreviados, generando agrupaciones incorrectas si no se usa similitud con revisión humana.
- El OCR o visión podría detectar números correctos pero asociarlos a la línea equivocada si no se preserva la estructura visual de la página.
- Algunas páginas parecen contener varios días o continuidad desde una página anterior, lo que obliga a modelar contexto de bloque y no solo imagen aislada.
- Algunas líneas tienen varios items/productos en una sola entrada, así que reducirlas a un único total sin guardar componentes destruiría evidencia útil.

## Validation Strategy

- Validar manualmente una muestra inicial de 10 a 15 imágenes de `data-avileo/JUAVIK/` para expandir abreviaturas antes de procesar todo el lote.
- En la muestra inicial, incluir páginas con continuidad, páginas con cambio de fecha a mitad de imagen y páginas con `yapeo`/`pago anterior` para validar los casos más riesgosos primero.
- Exigir que toda imagen tenga `pass-1` y `pass-2` con el mismo schema y un archivo reconciliado antes de considerarse “usable”.
- Medir concordancia entre pasadas en campos críticos: fecha, bloques por fecha, cantidad de líneas detectadas, cantidad de `entries[]` por línea, cliente, monto total, tipo de línea y hints de pago.
- Marcar para revisión humana cualquier línea donde `pass-1` y `pass-2` discrepen en cliente, producto, monto o clasificación.
- Marcar para revisión humana cualquier desacuerdo sobre `pago anterior`, `actual`, `NP`, `yapeo`, `xyapear/x yapear`, monto circulado o arrastre desde página previa.
- Verificar que el vocabulario final de pagos solo use métodos compatibles con `packages/backend/src/db/schema/enums.ts` (`efectivo`, `yape`, `plin`, `transferencia`, `tarjeta`, `saldo`) o quede como `unknown`/`hint`.
- Hacer una validación de negocio cruzada contra el modelo de deuda de `packages/backend/src/services/repository/customer.repository.ts` y `packages/app/app/lib/services/payment-service.ts`: una futura importación no debe convertir un hint o una nota en un abono confirmado sin evidencia suficiente.
- Confirmar que el resultado final conserva texto crudo y notas por línea para auditoría; no debe existir transformación irreversible sin traza.

## Open Questions

- ¿`xy` significa siempre “por yapear” o en algunos casos puede significar otra cosa?
- ¿Los símbolos `P`, `H`, `CH`, `ND`, `NP` son productos, unidades, estados de pago o abreviaturas personales del cuaderno?
- ¿Qué representa un monto circulado: saldo pendiente, pago parcial, cierre del cálculo o monto a cobrar?
- ¿El objetivo final será importar solo abonos/deudas, o también reconstruir ventas individuales por cliente y por fecha?
- ¿Deseas un JSON por imagen solamente, o también un JSON adicional consolidado por fecha/cliente una vez conciliadas todas las páginas?
- ¿Las líneas con múltiples operaciones deben partirse en sublíneas lógicas o conservarse como una sola evidencia con múltiples campos?
- ¿Se permitirá vincular automáticamente nombres normalizados a clientes ya existentes en Avileo, o primero debe existir una etapa de revisión humana?

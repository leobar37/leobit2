# Propuesta Técnica: Sistema de Distribución Flexible

## Resumen Ejecutivo

**Proyecto:** Avileo (PollosPro) - Sistema de gestión de ventas de pollo
**Estado actual:** El sistema de distribución es rígido, solo soporta kilos totales sin distinguir productos
**Problema:** Los negocios reales operan con múltiples productos (pollo, huevos, menudencias) y necesitan flexibilidad en cómo controlan el inventario asignado a vendedores
**Solución propuesta:** Arquitectura de distribución por variantes con modos de operación flexibles

---

## Contexto del Negocio

### Operación Actual Típica

**Caso 1: Pollería tradicional (modo estricto)**
- Admin compra 500kg de pollo
- Asigna 50kg a Juan (Carro A), 45kg a María (Casa)
- Vendedores solo pueden vender su asignación
- Al final del día, el stock no vendido se devuelve

**Caso 2: Venta flexible (modo acumulativo)**
- Se estima asignación pero no se pesa exactamente
- Vendedor vende lo que puede
- Al cierre se ajusta: "Realmente vendiste 42kg, te había asignado 45kg"
- No hay bloqueo por límite, solo seguimiento

**Caso 3: Venta en local (sin distribución)**
- Cliente llega al local del admin
- Admin vende directamente sin pasar por distribución
- No debe contar contra stock de vendedores

**Caso 4: Múltiples productos**
- Distribución incluye: 30kg pollo + 5 docenas huevos + 10kg menudencias
- Cada producto con su propia unidad de medida
- Control de stock independiente por producto

### Limitaciones del Sistema Actual

El sistema actual (`distribuciones.kilosAsignados`) no puede manejar estos escenarios:

1. **Monolítico:** Solo un número total de kilos, no por producto
2. **Binario:** Flag `usarDistribucion` es true/false, sin grados de flexibilidad
3. **Sin variantes:** No conecta con `productVariants` que ya existen en el sistema
4. **Sin validación backend:** El control de stock está solo en frontend
5. **Secuencial rígido:** Primero distribución → luego ventas. No permite venta primero/asignación después

---

## Análisis de Arquitectura Actual

### Modelo de Datos Existente

```
┌─────────────────────────────────────┐
│ PURCHASES (Compras)                 │
│ - Entrada de stock                  │
│ - Items con variantId               │
└─────────────┬───────────────────────┘
              │
              ▼ Actualiza SOLO inventory (producto general)
┌─────────────────────────────────────┐
│ INVENTORY (Stock por producto)      │
│ - quantity: total por producto      │
│ - NO conecta con variants           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ PRODUCT_VARIANTS                    │
│ - Ya existe tabla                   │
│ - Cada variante tiene precio        │
│ - VARIANT_INVENTORY existe pero     │
│   está desconectado del flujo       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ DISTRIBUCIONES (Actual)             │
│ - vendedorId                        │
│ - kilosAsignados (único número)     │
│ - kilosVendidos                     │
│ - NO tiene tabla de items           │
│ - NO conecta con variantes          │
└─────────────┬───────────────────────┘
              │
              ▼ Opcional
┌─────────────────────────────────────┐
│ SALES                               │
│ - distribucionId (nullable)         │
│ - items con variantId               │
│ - NO valida stock contra distribución│
└─────────────────────────────────────┘
```

### Problemas Arquitectónicos Identificados

**Problema 1: Stock desconectado**
- `variantInventory` existe pero `purchase.service` no lo actualiza
- Las compras solo modifican `inventory` (nivel producto)
- Resultado: `variantInventory` tiene datos inconsistentes

**Problema 2: Distribución sin granularidad**
- `distribuciones.kilosAsignados` es un campo numérico simple
- No permite: "30kg pollo grande + 20kg pollo mediano"
- No permite: "20kg pollo + 5 docenas huevos"

**Problema 3: Validación inexistente**
- `sale.service.createSale()` no recibe distribución
- No hay validación de límites en backend
- Un vendedor podría vender 1000kg cuando solo tiene 50kg asignados

**Problema 4: Modo binario insuficiente**
- `businesses.usarDistribucion` es boolean
- No distingue entre: estricto/acumulativo/libre
- Todos los negocios con distribución tienen el mismo comportamiento

---

## Propuesta de Arquitectura

### Principios de Diseño

1. **Separación de responsabilidades:** Stock central vs. Stock asignado
2. **Transaccionalidad:** Operaciones de stock deben ser atómicas
3. **Flexibilidad por negocio:** Cada negocio configura su modo de operación
4. **Consistencia offline:** Queue de operaciones con resolución de conflictos

### Modelo de Datos Propuesto

```
┌──────────────────────────────────────────────────────────────┐
│ COMPRAS (Purchases)                                          │
│ - Entrada de stock                                           │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼ Actualiza AMBOS inventarios
        ┌──────────────┐      ┌──────────────────┐
        │ INVENTORY    │      │ VARIANT_INVENTORY│ ← NUEVO: Conectar
        │ (general)    │      │ (por variante)   │
        └──────────────┘      └────────┬─────────┘
                                       │
┌──────────────────────────────────────┴──────────────────────┐
│ DISTRIBUCIONES                                              │
│ - vendedorId                                                │
│ - fecha                                                     │
│ - modo: 'estricto' | 'acumulativo' | 'libre' ← NUEVO       │
│ - confiarEnVendedor: boolean ← NUEVO                       │
│ - pesoConfirmado: boolean ← NUEVO                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼ Tiene muchos
┌─────────────────────────────────────────────────────────────┐
│ DISTRIBUCION_ITEMS ← NUEVA TABLA                            │
│ - distribucionId                                            │
│ - variantId ← FK a productVariants                          │
│ - cantidadAsignada                                          │
│ - cantidadVendida                                           │
│ - unidad: 'kg' | 'unidad' | 'docena'                        │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼ Descuenta cantidadVendida
┌─────────────────────────────────────────────────────────────┐
│ SALES                                                       │
│ - distribucionId (nullable)                                 │
│ - items con variantId                                       │
│ - Validación según modo                                     │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Stock

**1. Entrada (Compra)**
```
Compra 100kg Pollo Grande
  ↓
variantInventory['pollo-grande'] += 100
inventory['pollo'] += 100
```

**2. Asignación (Distribución)**
```
Crear Distribución para Juan
  ↓
distribucion_items: [
  { variant: 'pollo-grande', asignada: 30, vendida: 0 },
  { variant: 'huevos', asignada: 5, vendida: 0 }
]
  ↓
variantInventory['pollo-grande'] -= 30 (reserva)
variantInventory['huevos'] -= 5 (reserva)
```

**3. Venta (Modo Estricto)**
```
Juan vende 10kg pollo grande
  ↓
Validar: distribucion_items['pollo-grande'].vendida + 10 ≤ 30
  ↓
distribucion_items['pollo-grande'].vendida += 10
  ↓
Crear Sale con distribucionId
```

**4. Venta (Modo Acumulativo)**
```
Juan vende 35kg (más de lo asignado)
  ↓
Modo es 'acumulativo' → Permitir
  ↓
distribucion_items['pollo-grande'].vendida += 35
  ↓
Crear Sale con distribucionId
  ↓
Queda en negativo (o se ajusta después)
```

**5. Cierre**
```
Admin cierra distribución
  ↓
Por cada item:
  sobrante = asignada - vendida
  if sobrante > 0:
    variantInventory += sobrante (devolución)
  ↓
Marcar distribución como 'cerrado'
```

---

## Decisiones de Diseño

### Decisión 1: Tabla distribucion_items separada

**Alternativas consideradas:**
1. **JSON array en distribuciones:** Más simple pero sin integridad referencial, difícil de query
2. **Tabla separada:** Mayor complejidad pero permite joins, índices, validaciones

**Decisión:** Tabla separada con FK a productVariants

**Justificación:**
- Necesitamos validar que variantId existe
- Queries como "¿Qué vendedores tienen asignado pollo grande?" requieren joins
- Sync offline requiere entidades separadas
- Concurrencia: múltiples items pueden actualizarse simultáneamente

### Decisión 2: Tres modos de operación

**Alternativas consideradas:**
1. **Boolean flags:** `esEstricto`, `esAcumulativo` → Puede haber conflictos
2. **Enum de modo:** Un solo campo, valores excluyentes

**Decisión:** Campo `modo` con enum: 'estricto' | 'acumulativo' | 'libre'

**Justificación:**
- Claro y explícito
- Fácil de extender (agregar más modos)
- Validación en DB level (check constraint)
- Código más legible que múltiples booleanos

**Comportamiento por modo:**

| Modo | Crear sin distribución | Validar límites | Stock negativo |
|------|------------------------|-----------------|----------------|
| estricto | ❌ No permitido | ✅ Sí, bloquea | ❌ No |
| acumulativo | ❌ No permitido | ⚠️ Warning, permite | ✅ Sí |
| libre | ✅ Permitido | ❌ No aplica | N/A |

### Decisión 3: Validación en backend obligatoria

**Alternativas consideradas:**
1. **Solo frontend:** Más rápido pero inseguro
2. **Solo backend:** Seguro pero UX pobre (error después de escribir todo)
3. **Ambos:** Frontend para UX, backend para seguridad

**Decisión:** Validación en ambos lados

**Justificación:**
- Frontend: feedback inmediato al usuario
- Backend: última línea de defensa contra bugs/malicia
- Offline: frontend valida contra datos locales
- Concurrente: backend previene race conditions

### Decisión 4: Stock se reserva al crear distribución

**Alternativas consideradas:**
1. **Reserva inmediata:** Descontar de variantInventory al crear
2. **Reserva lazy:** Descontar solo cuando se vende

**Decisión:** Reserva inmediata

**Justificación:**
- Prevents overselling: Si asigno 50kg a Juan, esos 50kg no están disponibles para María
- Fiel a la realidad: El stock físico se separa/se etiqueta para cada vendedor
- Simplifica cierre: Solo devolver sobrante, no recalcular todo

**Trade-off:** Si Juan nunca vende, el stock queda "bloqueado" hasta el cierre. Mitigación: Admin puede cerrar distribución anticipadamente.

### Decisión 5: Confiar en vendedor (pesoConfirmado)

**Escenario:** Vendedor lleva pollo sin pesar exactamente. Reporta al final: "Vendí 45kg".

**Decisión:** Flag `confiarEnVendedor` y `pesoConfirmado`

**Flujo:**
1. Crear distribución: `confiarEnVendedor=true`, `pesoConfirmado=false`, `cantidadAsignada=0` (o estimado)
2. Vendedor vende: registra normal
3. Al final del día: Admin confirma/ajusta peso real
4. Actualizar: `pesoConfirmado=true`, `cantidadAsignada=pesoReal`

**Justificación:**
- Soporte real para operaciones informales
- Audit trail: Sabemos qué distribuciones tienen peso confirmado vs estimado
- Flexibilidad sin perder tracking

---

## Impacto en el Sistema

### Backend

**Cambios de schema (breaking):**
- Nueva tabla `distribucion_items`
- Columnas nuevas en `distribuciones`
- Columna nueva en `businesses`

**Servicios modificados:**
- `DistribucionService`: CRUD completo con items, reserva de stock
- `SaleService`: Validación de stock según modo
- `PurchaseService`: Actualizar `variantInventory`
- `SyncService`: Agregar entidad `distribucionItems`

**APIs nuevas/modificadas:**
```
POST   /distribuciones          ← Ahora requiere array de items
GET    /distribuciones/:id/items
POST   /distribuciones/:id/items
PUT    /distribuciones/:id/items/:itemId
DELETE /distribuciones/:id/items/:itemId
POST   /sales                   ← Ahora valida según modo
```

### Frontend

**Páginas modificadas:**
- `/distribuciones`: Formulario multi-items con selector de variantes
- `/mi-distribucion`: Mostrar tabla de items asignados
- `/ventas/nueva`: Validación de stock, warnings según modo

**Nuevos componentes:**
- `DistribucionItemsForm`: Lista editable de items
- `StockValidator`: Mostrar disponible/consumido
- `ModoDistribucionBadge`: Indicador visual del modo

**Hooks modificados:**
- `useDistribuciones`: Manejar items
- `useSales`: Validar antes de crear

### Datos y Migración

**Migración de datos existentes:**
```sql
-- Crear items para distribuciones existentes
INSERT INTO distribucion_items (
  distribucion_id,
  variant_id, -- ¿Qué variant? Necesitamos mapeo
  cantidad_asignada,
  cantidad_vendida,
  unidad
)
SELECT 
  d.id,
  (SELECT id FROM product_variants WHERE name = 'Pollo Entero' LIMIT 1), -- Asumir variante default
  d.kilos_asignados,
  d.kilos_vendidos,
  'kg'
FROM distribuciones d;
```

**Riesgo:** Las distribuciones existentes no tienen variantId. Opciones:
1. Asumir variante default (ej: "Pollo Entero")
2. Dejar items vacíos, migración manual por admin
3. Script interactivo que pregunte por cada distribución

**Recomendación:** Opción 2 (migración manual) para producción. Opción 1 para desarrollo.

---

## Plan de Implementación

### Fase 1: Schema y Modelos (2 días)

**Objetivo:** Base de datos lista, repositorios funcionando

**Tareas:**
1. Crear migración con:
   - Tabla `distribucion_items`
   - Columnas en `distribuciones` (modo, confiarEnVendedor, pesoConfirmado)
   - Columna en `businesses` (modoDistribucion)
2. Actualizar `db/schema/index.ts` con exports
3. Crear `DistribucionItemRepository`
4. Actualizar `DistribucionRepository` con métodos de items
5. Tests unitarios de repositorios

**Validación:**
```bash
bun run db:generate
bun run db:migrate
bun run test:db
```

### Fase 2: Lógica de Negocio (3 días)

**Objetivo:** Servicios funcionando con nuevo flujo

**Tareas:**
1. Modificar `DistribucionService.createDistribucion`:
   - Recibir array de items
   - Validar stock disponible en variant_inventory
   - Crear distribucion + items
   - Reservar stock (decrement variant_inventory)
2. Implementar `DistribucionService.closeDistribucion`:
   - Calcular sobrante por item
   - Devolver stock a variant_inventory
3. Modificar `SaleService.createSale`:
   - Buscar distribución del día
   - Si modo='estricto': validar stock disponible
   - Si modo='acumulativo': permitir, solo actualizar vendido
   - Actualizar cantidadVendida en items
4. Modificar `PurchaseService.createPurchase`:
   - También actualizar variant_inventory
5. Tests de integración

**Validación:**
- Flujo: Compra → Distribución → Venta → Cierre
- Validar que stock cuadra en cada paso

### Fase 3: API Layer (1 día)

**Objetivo:** Endpoints REST funcionando

**Tareas:**
1. Actualizar POST /distribuciones (nuevo body con items)
2. Crear endpoints de items
3. Actualizar POST /sales (validación distribución)
4. Documentación API (comentarios en código)
5. Tests de endpoints

**Validación:**
```bash
curl -X POST http://localhost:3000/api/distribuciones \
  -H "Content-Type: application/json" \
  -d '{
    "vendedorId": "...",
    "puntoVenta": "Carro A",
    "modo": "estricto",
    "items": [
      {"variantId": "...", "cantidadAsignada": 30, "unidad": "kg"}
    ]
  }'
```

### Fase 4: Frontend (3 días)

**Objetivo:** UI funcional para nuevo flujo

**Tareas:**
1. Modificar página Distribuciones:
   - Formulario items dinámico (agregar/eliminar)
   - Selector de variantes
   - Input cantidad + select unidad
   - Selector modo (estricto/acumulativo)
2. Modificar página Mi Distribución:
   - Mostrar tabla de items con progreso (asignado vs vendido)
3. Modificar Nueva Venta:
   - Validar stock disponible
   - Mostrar warning si excede
   - Deshabilitar submit si no hay stock (modo estricto)
4. Tests E2E

**Validación:**
- User journey: Admin crea distribución → Vendedor ve asignación → Vendedor vende → Admin cierra

### Fase 5: Sync Offline (2 días)

**Objetivo:** Funcionamiento offline completo

**Tareas:**
1. Agregar `distribucionItems` a SyncService
2. Lógica de conflict resolution:
   - Si admin modifica distribución online y vendedor vendió offline → estrategia de merge
3. Queue de operaciones offline
4. Tests de sync

**Validación:**
- Desconectar internet → Crear distribución → Vender → Reconectar → Sync correcto

---

## Riesgos y Mitigación

### Riesgo 1: Stock negativo

**Descripción:** Race conditions o bugs pueden llevar a stock negativo en variant_inventory

**Probabilidad:** Media
**Impacto:** Alto (inconsistencia de datos)

**Mitigación:**
- Constraint en DB: `CHECK (quantity >= 0)`
- Transacciones atómicas en Drizzle
- Validación antes de decrementar
- Alerta/monitoreo si ocurre

### Riesgo 2: Migración de datos fallida

**Descripción:** Distribuciones existentes sin variantId no pueden migrarse automáticamente

**Probabilidad:** Alta
**Impacto:** Medio (requiere trabajo manual)

**Mitigación:**
- Backup completo antes de migrar
- Script de migración con opción interactiva
- Opción de dejar items vacíos y llenar manualmente
- Documentación clara para el equipo

### Riesgo 3: Performance con muchos items

**Descripción:** Distribución con 20+ items podría ser lenta en validaciones

**Probabilidad:** Baja
**Impacto:** Medio (UX lenta)

**Mitigación:**
- Índices en `distribucion_items(distribucionId)`
- Queries optimizadas con joins
- Cache de stock en frontend
- Lazy loading de items

### Riesgo 4: Complejidad para usuarios

**Descripción:** Nuevo flujo más complejo, curva de aprendizaje

**Probabilidad:** Alta
**Impacto:** Medio (adopción)

**Mitigación:**
- Defaults razonables (modo='estricto', unidad='kg')
- UI intuitiva con validaciones visuales
- Tooltips y ayuda en contexto
- Tutorial/guía de migración

---

## Métricas de Éxito

### Técnicas
- ✅ Migración ejecuta sin errores
- ✅ Tests pasan >95%
- ✅ Tiempo de respuesta API <200ms
- ✅ Sin stock negativo en producción (primer mes)

### De Negocio
- ✅ Admin puede crear distribución multi-producto en <2 minutos
- ✅ Vendedor reduce tiempo de venta (menos errores de stock)
- ✅ 0 quejas de "no me dejó vender lo asignado" (bugs)

---

## Checklist Pre-Implementación

Antes de empezar, asegurar:

- [ ] Backup de producción
- [ ] Ambiente de staging listo
- [ ] Tests existentes pasan
- [ ] Documentación de rollback preparada
- [ ] Equipo de soporte informado
- [ ] Plan de comunicación a usuarios (qué cambiará)

---

## Checklist Post-Implementación

Después de deploy:

- [ ] Validar migración en producción
- [ ] Verificar primeras distribuciones creadas
- [ ] Monitorear errores 48h
- [ ] Revisar métricas de performance
- [ ] Feedback de usuarios (encuesta rápida)

---

## Conclusión

Esta propuesta resuelve las limitaciones arquitectónicas actuales permitiendo:

1. **Multi-producto:** Huevos, pollo, menudencias en misma distribución
2. **Flexibilidad operativa:** Modos estricto/acumulativo/libre según necesidad del negocio
3. **Confianza:** Soporte para venta sin peso inicial, confirmación posterior
4. **Seguridad:** Validación backend robusta contra overselling
5. **Escalabilidad:** Arquitectura extensible para futuros requerimientos

**Tiempo estimado:** 11 días de desarrollo (2+3+1+3+2)
**Riesgo principal:** Migración de datos históricos
**Recomendación:** Probar en staging 1 semana antes de producción

---

Documento generado: Análisis completo con contexto, decisiones justificadas y plan ejecutable

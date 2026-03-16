# Revision Integral del Sistema — Offline, Sincronizacion y Consistencia de Datos

**Fecha:** 2026-03-16  
**Branch:** feature/improvements  
**Commit base:** 136fd5e  

---

## Resumen Ejecutivo

Se identificaron **38 hallazgos** distribuidos en: **8 criticos**, **8 altos**, **14 medios** y **8 bajos**. Los problemas criticos incluyen tablas locales no creadas (visitas, grupos), sincronizacion de abonos completamente rota por mismatch de formato, IDs de entidades ignorados en el servidor creando desincronizacion de identidades, y una vulnerabilidad de seguridad en invitaciones.

---

## 1. Hallazgos por Modulo

### 1.1 VENTAS (Sales)

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| SAL-01 | **CRITICA** | `AbonoSyncHandler.handleCreate()` ignora el `entityId` del cliente. El servidor genera un UUID diferente al local. Al hacer pull-sync, el abono aparece como registro duplicado en PGlite. |
| SAL-02 | **ALTA** | `updateItem()` y `removeItem()` no usan `syncGroupId`. Las operaciones de items pueden llegar al servidor antes que la venta padre, causando FK violations. |
| SAL-03 | **MEDIA** | La venta compartida (sale tokens) es 100% online-only. No hay fallback offline para compartir. Aceptable por diseno pero no documentado. |
| SAL-04 | **MEDIA** | `confirm()` no valida que la venta tenga items. El `saleSyncHook` que bloqueaba ventas vacias esta **deshabilitado** (comentado en registry.ts). |
| SAL-05 | **BAJA** | Timing window: si se elimina una venta localmente pero una actualizacion de item llega al servidor primero, puede fallar o crear operaciones huerfanas. |

### 1.2 ABONOS / COBROS

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| ABO-01 | **CRITICA** | `PaymentService.create()` envia el payload de sync con claves `snake_case` (`customer_id`, `payment_method`) pero el backend `abonoCreateSchema` espera `camelCase` (`customerId`, `paymentMethod`). **La sincronizacion de abonos al servidor esta completamente rota.** |
| ABO-02 | **CRITICA** | `PaymentService.getCustomerDebtBalance()` consulta `status = 'credit'` (inexistente) y `count_toward_debt` (columna inexistente). Siempre retorna 0. La validacion de deuda antes de crear pagos esta rota. |
| ABO-03 | **ALTA** | No hay actualizacion de `updatedAt` en la tabla de abonos. Sin timestamp de actualizacion, no es posible implementar conflict resolution basado en timestamps para pagos. |
| ABO-04 | **MEDIA** | Inconsistencia en calculo de balance: `PaymentService.getCustomerDebtBalance()` (roto) vs `useAccountsReceivable` hook (correcto). Dos fuentes de verdad divergentes. |

### 1.3 CLIENTES (Customers)

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| CLI-01 | **MEDIA** | Sin prevencion de duplicados. No hay unique constraints en `name`, `phone`, o `dni`. Dos usuarios offline pueden crear el mismo cliente simultaneamente. |
| CLI-02 | **MEDIA** | Sin UI de resolucion de conflictos. `TimestampConflictResolver` detecta conflictos pero no hay interfaz para resolverlos. Los conflictos quedan en estado `CONFLICT` indefinidamente. |
| CLI-03 | **MEDIA** | `createdBy` siempre es `null` en clientes creados offline. Se pierde la trazabilidad del creador. |
| CLI-04 | **BAJA** | `CustomerSyncHandler.handleCreate()` en el backend ignora `operation.entityId` — genera nuevo ID en servidor. Mismo problema de desincronizacion de IDs que abonos (SAL-01). |

### 1.4 VISITAS

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| VIS-01 | **CRITICA** | La tabla `visitas` **NO esta creada** en PGlite local (`engine/db.ts` → `createTables()`). Todas las operaciones offline fallan con "relation 'visitas' does not exist". |
| VIS-02 | **CRITICA** | `visitas` no tiene entrada en `SHAPES_CONFIG`. El pull-sync nunca entrega datos de visitas del servidor al cliente. |
| VIS-03 | **ALTA** | `vendedorId` se establece como `this.businessId` (UUID del negocio) en vez del ID del usuario vendedor (`businessUserId`). Dato incorrecto. |
| VIS-04 | **ALTA** | No esta en `SYNC_STATUS_ENTITY_TABLES` ni `SELF_HEAL_INSERTABLE_ENTITIES`. El `sync_status` local nunca se actualiza a "synced" y no hay auto-reparacion. |
| VIS-05 | **MEDIA** | Sin prevencion de visitas duplicadas (mismo cliente + misma distribucion). |

### 1.5 GRUPOS DE CLIENTES

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| GRP-01 | **CRITICA** | Las tablas `customer_groups` y `customer_group_members` **NO estan creadas** en PGlite local. Todas las operaciones offline estan rotas. |
| GRP-02 | **CRITICA** | Sin entrada en `SHAPES_CONFIG`. No hay pull-sync para grupos ni miembros. |
| GRP-03 | **ALTA** | `addedBy` se establece como `businessId` en vez del ID del usuario. Mismo bug que VIS-03. |
| GRP-04 | **ALTA** | EntityId compuesto para miembros (`${groupId}_${customerId}`) no funciona con pull-sync ni self-healing. |
| GRP-05 | **MEDIA** | Al eliminar un grupo, las eliminaciones de miembros no se sincronizan individualmente — depende de CASCADE en el servidor. Si el grupo nunca se sincronizo, los miembros quedan huerfanos localmente. |

### 1.6 DISTRIBUCIONES

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| DIS-01 | **MEDIA** | `DistribucionItemRepository` no filtra por `ctx.businessId` en `findByDistribucionId`, `updateVendido` y `delete`. Gap de multi-tenancy (mitigado porque la distribucion padre si filtra). |
| DIS-02 | **BAJA** | Todas las operaciones de escritura son online-only (`useOfflineAwareMutation`). Aceptable por diseno (requiere validacion de stock) pero limita el uso offline. |

### 1.7 ROLES Y PERMISOS

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| ROL-01 | **MEDIA** | Sin sistema centralizado de permisos en frontend. Cada pagina hace verificacion ad-hoc con `business?.role === "ADMIN_NEGOCIO"`. No esta alineado con el modelo de permisos del backend (`hasPermission()`). |
| ROL-02 | **BAJA** | Si el admin cambia el rol de un usuario mientras esta offline, el cambio no se aplica hasta re-login. El cache de sesion local mantiene el rol anterior. |

### 1.8 INVITACIONES DE USUARIOS

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| INV-01 | **ALTA** | `POST /public/invitations/accept` acepta `{ token, userId }` sin verificar que `userId` corresponda al usuario autenticado. Un atacante con un token valido y cualquier userId puede agregar usuarios arbitrarios a un negocio. **Vulnerabilidad de seguridad.** |
| INV-02 | **MEDIA** | `acceptInvitation` bloquea membresia multi-negocio (`findByUserId` retorna primer negocio) a pesar de que la arquitectura declara soporte para multiples negocios. |

### 1.9 WHATSAPP / TEMPLATES

| ID | Prioridad | Hallazgo |
|----|-----------|----------|
| WHA-01 | **MEDIA** | Inngest function en `whatsapp-functions.ts:27` actualiza status a `"enviado"` en vez de `"entregado"` al enviar exitosamente. Los mensajes nunca muestran como "entregados". |
| WHA-02 | **BAJA** | Sin rate limiting en envios masivos (`sendBulkMessages`). Todos los eventos Inngest se despachan simultaneamente, puede disparar rate limits de Evolution API. |
| WHA-03 | **BAJA** | Filtro de categoria en templates no implementado en backend a pesar de que el frontend lo envia como query param. |

---

## 2. Riesgos Criticos de Sincronizacion y Consistencia

### RIESGO 1: Desincronizacion de IDs (Critico)
**Entidades afectadas:** Abonos, Clientes (parcial)

Los sync handlers del backend ignoran el `entityId` enviado por el cliente y generan nuevos UUIDs. Cuando el pull-sync trae estos registros de vuelta, aparecen como registros **diferentes** a los creados localmente. Resultado: **duplicados inevitables** en la base local.

### RIESGO 2: Abonos nunca se sincronizan (Critico)
**Impacto:** Perdida total de datos de pagos

El mismatch `snake_case` vs `camelCase` (ABO-01) hace que cada intento de sync de abonos falle la validacion Zod. Despues de 5 reintentos, los abonos van al Dead Letter Queue. Los pagos existen solo localmente y nunca llegan al servidor.

### RIESGO 3: Visitas y Grupos completamente inoperables offline (Critico)
**Impacto:** Features inutilizables

Sin tablas en PGlite (VIS-01, GRP-01) y sin shape config (VIS-02, GRP-02), estas features no funcionan ni offline ni reciben datos del servidor.

### RIESGO 4: FK Violations en sync push (Alto)
**Entidades afectadas:** Visitas → Clientes, Grupos → Clientes, Items → Ventas

No hay ordenamiento de dependencias en el push sync. Si un cliente se crea offline junto con una visita para ese cliente, la visita puede sincronizarse **antes** que el cliente, causando FK violation en PostgreSQL. El retry eventualmente lo resuelve (si el cliente se sincroniza en el siguiente batch), pero consume reintentos y puede llevar al DLQ.

### RIESGO 5: Vulnerabilidad de seguridad en invitaciones (Alto)
**Impacto:** Escalacion de privilegios

Cualquier persona con un token de invitacion valido puede agregar usuarios arbitrarios a un negocio sin autenticacion.

---

## 3. Casos que Hoy Pueden Romper el Flujo Offline

| # | Escenario | Resultado | Probabilidad |
|---|-----------|-----------|-------------|
| 1 | Usuario crea un abono offline | El abono se crea localmente pero **NUNCA** sincroniza al servidor. Despues de 5 reintentos va al DLQ. | **Seguro** (100%) |
| 2 | Usuario intenta crear una visita | Error SQL inmediato: tabla no existe en PGlite | **Seguro** (100%) |
| 3 | Usuario intenta crear un grupo de clientes | Error SQL inmediato: tabla no existe en PGlite | **Seguro** (100%) |
| 4 | Dos vendedores crean el mismo cliente offline | Ambos se sincronizan exitosamente → cliente duplicado en servidor | **Alta** |
| 5 | Vendedor crea cliente + venta para ese cliente offline | La venta puede sincronizarse antes que el cliente → FK violation → reintentos hasta que el cliente exista o DLQ | **Alta** |
| 6 | Admin cambia rol de vendedor mientras esta offline | El vendedor sigue operando con permisos antiguos hasta re-login | **Media** |
| 7 | Usuario crea pago y el `getCustomerDebtBalance()` es llamado | Retorna 0 (consulta SQL rota) → puede bloquear creacion de pagos validos | **Alta** |
| 8 | Pull sync trae un abono del servidor | Si el mismo abono fue creado localmente, aparece como registro duplicado (IDs diferentes) | **Alta** |

---

## 4. Recomendaciones Concretas

### Prioridad CRITICA (resolver inmediatamente)

**R1. Crear tablas faltantes en PGlite** (VIS-01, GRP-01, GRP-02)
- Archivo: `packages/app/app/engine/db.ts` → `createTables()`
- Agregar `CREATE TABLE IF NOT EXISTS` para `visitas`, `customer_groups`, `customer_group_members`
- Incrementar `SCHEMA_VERSION` para forzar recreacion

**R2. Agregar shapes faltantes en config** (VIS-02, GRP-02)
- Archivo: `packages/app/app/lib/sync/shape-config.ts`
- Agregar entradas para `visitas` (priority 30), `customer_groups` (priority 10), `customer_group_members` (priority 30)

**R3. Corregir payload de abonos** (ABO-01)
- Archivo: `packages/app/app/lib/services/payment-service.ts`
- Cambiar el payload de sync a `camelCase`: `customerId`, `paymentMethod`, `sellerId`, etc.

**R4. Preservar entityId en sync handlers** (SAL-01, CLI-04)
- Archivos: `AbonoSyncHandler.ts`, `CustomerSyncHandler.ts`
- Pasar `operation.entityId` como el ID del registro al crear en el servidor
- Esto evita la desincronizacion de IDs entre cliente y servidor

**R5. Corregir getCustomerDebtBalance()** (ABO-02)
- Archivo: `packages/app/app/lib/services/payment-service.ts`
- Cambiar `status = 'credit'` por `sale_type = 'credito'`
- Eliminar referencia a `count_toward_debt` (no existe)
- Filtrar por `status NOT IN ('draft', 'cancelled')`

**R6. Corregir vulnerabilidad de invitaciones** (INV-01)
- Archivo: `packages/backend/src/api/invitations.ts` (ruta publica)
- Requerir autenticacion en `POST /public/invitations/accept`
- Verificar que el `userId` del body coincida con el usuario autenticado de la sesion

### Prioridad ALTA (resolver esta semana)

**R7. Registrar entidades faltantes en sync config** (VIS-04)
- Agregar `visitas`, `customer_groups`, `customer_group_members` a `SYNC_STATUS_ENTITY_TABLES` y `SELF_HEAL_INSERTABLE_ENTITIES` en `sync-service.ts`

**R8. Corregir vendedorId/addedBy** (VIS-03, GRP-03)
- En `VisitaService.create()`: usar `businessUserId` en vez de `businessId`
- En `CustomerGroupService.addMembers()`: usar `businessUserId` en vez de `businessId`

**R9. Implementar ordenamiento de dependencias en push sync**
- Opcion A: Ordenar operaciones por prioridad de entidad (customers primero, luego visitas/grupos)
- Opcion B: Usar `syncGroupId` para agrupar operaciones dependientes
- Opcion C: Backend acepta FK violations gracefully y reencola

**R10. Agregar syncGroupId a operaciones de items** (SAL-02)
- En `SaleService.updateItem()` y `removeItem()`, buscar el `syncGroupId` original de la venta padre

### Prioridad MEDIA (planificar para sprint siguiente)

**R11. Implementar UI de resolucion de conflictos** (CLI-02)
- Mostrar notificacion cuando hay conflictos pendientes
- Pantalla de resolucion: mostrar version local vs servidor, permitir elegir

**R12. Agregar prevencion de duplicados para clientes** (CLI-01)
- Unique constraint compuesto en `(businessId, phone)` o `(businessId, dni)`
- Check de duplicados antes de insertar localmente

**R13. Corregir status de WhatsApp** (WHA-01)
- Cambiar `"enviado"` a `"entregado"` en el handler de exito de Inngest

**R14. Centralizar sistema de permisos en frontend** (ROL-01)
- Crear `usePermissions()` hook y `<RequirePermission>` wrapper
- Alinear con el modelo de permisos del backend

**R15. Fix composite entityId para group members** (GRP-04)
- Generar UUID real para cada registro de miembro
- Usar ese UUID como entityId para sync

### Prioridad BAJA (backlog)

**R16.** Rate limiting para envios masivos de WhatsApp (WHA-02)
**R17.** Filtro de categoria en templates backend (WHA-03)
**R18.** Multi-tenancy en `DistribucionItemRepository` (DIS-01)
**R19.** Setear `createdBy` correctamente en clientes offline (CLI-03)
**R20.** Re-habilitar `saleSyncHook` para validar ventas vacias (SAL-04)

---

## 5. Problemas Transversales

### Race Conditions Identificadas
1. **Sync concurrente de entidades dependientes**: Cliente + Venta creados offline pueden sincronizarse en batches diferentes sin orden garantizado
2. **Operaciones de items sin syncGroupId**: Items de venta pueden llegar antes que la venta padre
3. **Pull + Push simultaneo**: Si pull-sync trae un registro mientras push-sync esta enviando el mismo, puede haber estado inconsistente temporalmente

### Reintentos que Pueden Duplicar Operaciones
1. **Abonos**: El servidor genera nuevo ID en cada reintento (porque ignora entityId). Mitigado por `idempotencyKey` en `sync_operations`, pero si la operacion falla antes de registrarse ahi, el reintento crea un registro diferente.
2. **createWithItems**: Genera nuevo `saleId` en cada invocacion. Si el primer intento fallo despues de encolar sync pero antes de commit local, hay una operacion huerfana en la cola.

### Problemas de Idempotencia
1. **Backend idempotency via operationId**: Bien implementado. Si un `operationId` ya fue procesado, retorna exito inmediato.
2. **Frontend coalescing**: Bien implementado. Merge de operaciones pendientes para la misma entidad.
3. **Gap**: El `referenceNumber` en abonos es la unica proteccion de idempotencia a nivel de datos, pero no todos los abonos tienen `referenceNumber`.

### Manejo de Conflictos
- **Solo 2 de 13 entidades tienen conflict resolution real**: customers (timestamp) y sales (version)
- **Las demas 11 entidades usan NoOp**: last-write-wins silencioso sin deteccion
- **No hay UI de conflictos**: Los conflictos detectados quedan en estado `CONFLICT` sin forma de resolverlos

### Dependencias entre Entidades al Sincronizar
```
customers (priority 10) ← visitas, customer_group_members, sales, abonos
sales (priority 20) ← sale_items, abonos (relatedSaleId)
distribuciones (priority 25) ← visitas (distribucionId), distribucion_items
customer_groups (priority 10) ← customer_group_members
```
El pull-sync respeta estas prioridades. El push-sync **NO** — usa solo `created_at ASC`.

---

## Metricas de Riesgo

| Modulo | Estado Offline | Sync Push | Sync Pull | Consistencia | Score |
|--------|---------------|-----------|-----------|-------------|-------|
| Ventas | ✅ Funcional | ⚠️ Items sin grupo | ✅ OK | ⚠️ ID mismatch abonos | 6/10 |
| Abonos | ✅ Local OK | ❌ Roto (casing) | ⚠️ IDs duplicados | ❌ Inconsistente | 2/10 |
| Clientes | ✅ Funcional | ✅ OK | ✅ OK | ⚠️ Sin dedup | 7/10 |
| Visitas | ❌ Tabla no existe | ❌ Config faltante | ❌ Config faltante | ❌ N/A | 0/10 |
| Grupos | ❌ Tablas no existen | ❌ Config faltante | ❌ Config faltante | ❌ N/A | 0/10 |
| Distribuciones | ⚠️ Solo lectura offline | ✅ OK | ✅ OK | ✅ OK | 8/10 |
| Roles | ✅ Cache funcional | N/A | N/A | ⚠️ Cache stale | 7/10 |
| Invitaciones | N/A (online-only) | N/A | N/A | ❌ Vuln seguridad | 5/10 |
| WhatsApp | N/A (online-only) | N/A | N/A | ⚠️ Status bug | 6/10 |

---

*Reporte generado por revision automatizada del codigo fuente. Se recomienda validacion manual de los escenarios criticos.*

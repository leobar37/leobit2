# Decision Log (ADR)

> Registro de decisiones arquitectónicas importantes para el sistema offline-first

## Formato

Cada decisión sigue el formato ADR (Architecture Decision Record):
- **Contexto**: Situación que requería decisión
- **Decisión**: Qué se decidió
- **Consecuencias**: Impacto positivo y negativo

---

## ADR-001: Migración de TanStack DB a PGlite + Electric

**Fecha**: 2025-03-XX
**Estado**: Aceptada
**Contexto**: Sistema actual usa TanStack DB con @tanstack/electric-db-collection. Performance degradada con datasets grandes, queries complejas difíciles.

### Opciones Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Mantener TanStack DB** | No migración, funciona ahora | Performance, queries limitadas |
| **B. PGlite + Electric** | SQL completo, transacciones, Drizzle | Bundle size (+2.6MB), migración requerida |
| **C. IndexedDB crudo** | Mínimo bundle | Sin tipos, queries complejas imposibles |
| **D. SQLite WASM** | Similar a PGlite | Menos maduro, sin Electric integration |

### Decisión
Elegimos **Opción B: PGlite + Electric** con patrón híbrido (Electric para reads, API para writes).

### Consecuencias

**Positivas:**
- SQL completo con joins, transacciones, índices
- Drizzle ORM tipado compartido frontend/backend
- Sync automático vía Electric (sin polling manual)
- Cache estructurado funciona offline

**Negativas:**
- Bundle size aumenta ~2.5MB
- Requiere migración de datos existentes
- Learning curve para equipo (Drizzle, PGlite)
- WebAssembly no funciona en todos los browsers antiguos

---

## ADR-002: Patrón Híbrido (Electric Reads + API Writes)

**Fecha**: 2025-03-XX
**Estado**: Aceptada
**Contexto**: ElectricSQL ofrece sync bidireccional, pero necesitamos validación de negocio en escrituras.

### Opciones Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Electric bidireccional** | Sync automático todo | Sin validación de negocio en cliente |
| **B. API solo** | Full control | No sync automático, polling manual |
| **C. Híbrido (elegido)** | Electric reads + API writes | Más complejo, dos sistemas |

### Decisión
**Opción C: Patrón Híbrido**
- Electric maneja sync de servidor a cliente (automático)
- API REST maneja escrituras con validación
- Queue offline para soportar sin conexión

### Consecuencias

**Positivas:**
- Validación de negocio garantizada en backend
- UX fluida con sync automático de reads
- Offline support completo
- Compatible con arquitectura actual

**Negativas:**
- Dos flujos diferentes (leer vs escribir)
- Complejidad de queue offline
- Latencia adicional en escrituras

---

## ADR-003: IndexedDB para Write Queue

**Fecha**: 2025-03-XX
**Estado**: Aceptada
**Contexto**: Necesitamos persistir writes cuando está offline, sobrevive a cierre de app.

### Opciones Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Memory only** | Simple | Se pierde al cerrar app |
| **B. LocalStorage** | Persistente | Límite 5MB, no estructurado |
| **C. IndexedDB (elegido)** | Persistente, estructurado, grande | API verbosa, más código |
| **D. PGlite temp table** | En la misma DB | No persiste entre sesiones |

### Decisión
**Opción C: IndexedDB**

### Consecuencias

**Positivas:**
- Persistencia real (sobrevive cierre de app)
- Capacidad prácticamente ilimitada
- Estructurado (object stores, indexes)
- Transactions para integridad

**Negativas:**
- API callback-based (no async/await nativo)
- Código más verboso
- Debugging más difícil que SQLite

---

## ADR-004: Schema Compartido con Drizzle

**Fecha**: 2025-03-XX
**Estado**: Aceptada
**Contexto**: Mantener sincronización entre frontend y backend types.

### Opciones Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Zod frontend + Drizzle backend** | Flexible | Duplicación, riesgo de drift |
| **B. Drizzle compartido (elegido)** | Single source of truth | Frontend bundle incluye Drizzle |
| **C. JSON Schema + generación** | Language agnostic | Tooling adicional |

### Decisión
**Opción B: Drizzle compartido**
- Archivo `packages/shared/schema.ts` o copiado
- Tipos exportados: `type Customer = typeof customers.$inferSelect`

### Consecuencias

**Positivas:**
- Un solo lugar para cambiar schema
- Types automáticos en ambos lados
- Cambios propagan instantáneamente

**Negativas:**
- Frontend bundle incluye código de schema
- Versionado cuidadoso requerido

---

## ADR-005: Filtro por Tenant en Todos los Shapes

**Fecha**: 2025-03-XX
**Estado**: Aceptada
**Contexto**: Multi-tenancy, cada negocio solo debe ver sus datos.

### Decisión
**TODOS los shapes deben incluir `business_id` filter:**

```typescript
// OBLIGATORIO
syncShapeToTable({
  shape: {
    table: 'customers',
    params: { where: `business_id = '${businessId}'` }
  }
})

// PROHIBIDO - Nunca hacer
syncShapeToTable({
  shape: { table: 'customers' } // Sin filtro!
})
```

### Consecuencias

**Positivas:**
- Seguridad: negocios aislados
- Performance: menos data transfer
- Memoria: solo datos relevantes en cliente

**Negativas:**
- Siempre necesitas businessId disponible
- Cambiar de negocio requiere re-sync completo
- Query params más complejos

---

## ADR-006: Last-Write-Wins para Conflictos

**Fecha**: 2025-03-XX
**Estado**: Aceptada
**Contexto**: Resolución de conflictos cuando dos usuarios editan mismo registro.

### Opciones Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Last-write-wins (elegido)** | Simple, predecible | Puede perder cambios |
| **B. Server-wins siempre** | Consistente | Usuario frustrado |
| **C. Client-wins siempre** | UX mejor | Data inconsistency |
| **D. Merge automático por campo** | Menos pérdida | Complejo, no siempre posible |
| **E. UI de resolución manual** | Control total | Friction en UX |

### Decisión
**Opción A: Last-Write-Wins por timestamp**

```typescript
// Backend resuelve automáticamente
if (incomingTimestamp > existingTimestamp) {
  accept(incomingChange);
} else {
  reject(incomingChange);
}
```

### Consecuencias

**Positivas:**
- Simple de implementar
- Determinístico
- No requiere intervención usuario

**Negativas:**
- Cambios simultáneos pueden perderse
- Usuario no sabe si su cambio fue sobreescrito

**Mitigación:**
- Editar registros diferentes reduce conflictos
- Para datos críticos, usar locking optimista (version field)

---

## ADR-007: No Implementar Optimistic Updates

**Fecha**: 2025-03-XX
**Estado**: Aceptada (provisional)
**Contexto**: Decidir si UI muestra cambio inmediato (optimistic) o espera confirmación.

### Decisión
**Fase 1: Sin optimistic updates**
- Esperar confirmación de API antes de actualizar UI
- Mostrar loading states
- Simpler mental model

**Fase 2 (futuro):** Evaluar optimistic para UX crítica

### Consecuencias

**Positivas:**
- Código más simple
- No rollback complejo
- Usuario siempre ve data confirmada

**Negativas:**
- UX más lenta (esperar API)
- Múltiples clicks posibles si lento

**Nota:** Electric ya da "optimistic" en reads (datos locales instantáneos), solo writes son pesimistas.

---

## ADR-008: Sync Inicial Completo (sin paginación)

**Fecha**: 2025-03-XX
**Estado**: Aceptada (con límites)
**Contexto**: Cargar todos los datos del negocio al inicio.

### Decisión
**Sync completo para datasets < 5000 registros**
- Una sola descarga inicial
- Todo disponible offline inmediatamente
- Sin paginación compleja

**Límite:** Si negocio tiene > 5000 ventas, implementar:
- Time-based filtering (últimos 90 días)
- Lazy loading de histórico
- Archivo de ventas antiguas

### Consecuencias

**Positivas:**
- Código simple
- UX rápida después de sync inicial
- Búsqueda local funciona en todo

**Negativas:**
- Sync inicial lento si muchos datos
- Uso de memoria proporcional a dataset
- Re-sync completo en cambio de negocio

---

## Decisiones Pendientes

### [PENDING] Estrategia de Retry

**Pregunta:** ¿Cuántos reintentos y con qué backoff?

**Opciones:**
- 3 reintentos con exponential backoff (1s, 2s, 4s)
- Infinitos reintentos cada 30 segundos
- Manual retry only (notificar usuario)

**Status:** Pendiente de testing con usuarios reales

---

### [PENDING] Purga de Datos Locales

**Pregunta:** ¿Cuándo limpiar datos de PGlite?

**Opciones:**
- Nunca (hasta logout)
- Después de X días sin usar app
- Cuando cambia de negocio (ya implementado)
- Límite de tamaño (auto-purge oldest)

**Status:** Requiere análisis de uso

---

## Historial de Cambios

| Fecha | Decisión | Cambio | Razón |
|-------|----------|--------|-------|
| 2025-03-XX | ADR-001 | Migración a PGlite | Performance |
| 2025-03-XX | ADR-002 | Patrón híbrido | Validación |
| 2025-03-XX | ADR-003 | IndexedDB queue | Persistencia |
| 2025-03-XX | ADR-004 | Drizzle compartido | Tipos |
| 2025-03-XX | ADR-005 | Filtro tenant | Seguridad |
| 2025-03-XX | ADR-006 | Last-write-wins | Simplicidad |

---

## Referencias

- [Arquitectura](./02-arquitectura.md)
- [Flujos de sincronización](./03-flujo-sync.md)
- [ADRs Wikipedia](https://en.wikipedia.org/wiki/Architectural_decision)

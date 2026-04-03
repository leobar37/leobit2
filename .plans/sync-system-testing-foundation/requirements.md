# Requirements: Sync System Testing Foundation

## Context

El sistema de sincronización de Avileo tiene un problema crítico: cuando un usuario hace login por primera vez (o después de limpiar datos), el sync se queda "plantado" en la etapa CRITICAL mostrando "Datos de referencia esenciales: 0 registros".

**Causa raíz identificada:** El backend `/sync/changes` solo retorna datos de la tabla `sync_operations` (registros con `status = "processed"`). Si no existen registros en `sync_operations` para las entidades solicitadas, el sync retorna 0 cambios y la UI se queda congelada en un loop infinito potencial.

## Objetivo

Crear una base sólida y testeable para el sistema de sincronización que:
1. Detecte y prevenga el sync "plantado"
2. Tenga cobertura de tests unitarios e integración
3. Sea mantenible y extensible

## Requisitos Funcionales

### RF-001: Estructura de Tests
- Tests unitarios para `StagedPullCoordinator`
- Tests unitarios para `PullService` (edge cases)
- Tests de integración para el flujo completo de sync
- Tests unitarios para sync handlers del backend
- Cobertura mínima: 80%

### RF-002: Protección contra Loops Infinitos
- Máximo de iteraciones en loops `while(hasMore)` (100)
- Timeout por etapa de sync (30 segundos)
- Métricas de progreso visibles
- Error claro cuando se alcanza límite

### RF-003: Manejo de sync_operations Vacía
- Detectar cuando no hay datos en `sync_operations`
- Mostrar error accionable al usuario
- Sugerir solución (backfill o esperar)
- No bloquear UI innecesariamente

### RF-004: Interfaces para Testabilidad
- Extraer interfaces para `PullService` y `SyncService`
- Permitir inyección de dependencias (DI)
- Crear test doubles para PGlite

### RF-005: Flujo de Error Visible
- Mensajes de error específicos por etapa
- Contador de registros sincronizados
- Indicador de etapa actual
- Retry manual disponible

## Requisitos No Funcionales

### RNF-001: Performance de Tests
- Tests unitarios: < 50ms por test
- Tests de integración: < 200ms por test
- Mock de APIs externas (no llamadas reales)
- Uso de `vi.mock` para dependencias lentas

### RNF-002: Mantenibilidad
- Patrones consistentes con tests existentes
- Nomenclatura clara: `*.test.ts` para unitarios, `*.integration.spec.tsx` para integración
- Mocks centralizados en `tests/mocks/`
- Handlers de MSW organizados por dominio

### RNF-003: Documentación
- JSDoc en helpers de test
- Comentarios en patterns no-obvios
- Cobertura de edge cases documentada

## Casos de Test a Cubrir

### CT-001: StagedPullCoordinator
- [ ] Carga secuencial de 3 etapas
- [ ] Cálculo correcto de progreso por etapa
- [ ] Error en etapa CRITICAL detiene flujo
- [ ] Error en etapa RECENT_SALES detiene flujo
- [ ] Error en etapa HISTORICAL no bloquea UI
- [ ] Máximo de iteraciones protege contra loop infinito

### CT-002: PullService
- [ ] Pull con cursor vacío (primera vez)
- [ ] Pull con cursor existente (incremental)
- [ ] Pull devuelve 0 cambios y `hasMore: false`
- [ ] Pull devuelve 0 cambios pero `hasMore: true` (edge case)
- [ ] Error HTTP 401/403/500 maneja correctamente
- [ ] Backoff exponencial después de fallos
- [ ] Concurrent pulls prevented

### CT-003: Sync Flow (Integración)
- [ ] Flujo completo: login → sync → dashboard
- [ ] Primera sync sin cursor ejecuta staged load
- [ ] Sync con cursor ejecuta quick pull
- [ ] Error de red muestra retry button
- [ ] 0 registros en CRITICAL muestra error claro

### CT-004: Backend Handlers
- [ ] CustomerSyncHandler crea registro correcto
- [ ] SaleSyncHandler crea sync_operations
- [ ] Payload se transforma correctamente
- [ ] Errores de validación retornan 400

## Gaps Identificados

| Gap | Prioridad | Descripción |
|-----|-----------|-------------|
| G-001 | CRITICAL | `StagedPullCoordinator` no tiene tests |
| G-002 | CRITICAL | `while(hasMore)` puede loop infinitamente |
| G-003 | HIGH | No hay manejo de `sync_operations` vacía |
| G-004 | HIGH | `PullService` falta testear edge cases |
| G-005 | MEDIUM | No hay tests de integración del flujo completo |
| G-006 | MEDIUM | Backend handlers no tienen tests unitarios |
| G-007 | LOW | No hay test doubles para PGlite |

## Dependencias

- Vitest 3.x (ya configurado)
- MSW 2.x (ya configurado)
- React Testing Library (ya configurado)
- Happy-DOM (ya configurado)

## Métricas de Éxito

- [ ] 90%+ cobertura en `StagedPullCoordinator`
- [ ] 85%+ cobertura en `PullService`
- [ ] 100% de edge cases de CT-002 cubiertos
- [ ] Flujo de sync de CT-003 automatizado
- [ ] 0 loops infinitos posibles (protegidos por código)
- [ ] Error de `sync_operations` vacía visible y accionable

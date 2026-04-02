# Implementar Sincronización por Etapas (Staged Loading)

## Objective

Implementar una estrategia de sincronización por etapas (staged loading) 100% secuencial que permita cargar datos críticos primero (clientes, productos, ventas recientes) y el histórico completo (abonos, purchases) en background, reduciendo el tiempo de carga inicial de 9-20 segundos a 3-5 segundos con 500-600 registros. El procesamiento se mantiene secuencial en todo momento para garantizar cero race conditions.

## Scope

### In Scope

- Implementar `StagedPullCoordinator` en frontend para orquestar carga por etapas de forma secuencial
- Modificar backend endpoint `/sync/changes` para soportar filtrado por entidad y rango de fechas
- Aumentar `BATCH_SIZE` de 50 a 100 para reducir número de HTTP requests
- Crear UI components para mostrar progreso de carga por etapas
- Unit tests para `StagedPullCoordinator`
- Integration tests para el flujo completo de staged sync
- Actualizar configuración de batch sizes para optimizar rendimiento

### Out of Scope

- Concurrencia o paralelismo con p-queue u otras librerías (mantener procesamiento secuencial)
- Modificar arquitectura de backend sync engine (se mantiene con savepoints)
- Cambiar sistema de conflict resolution existente
- Implementar paginación compleja (cursor-based está funcionando)
- Modificar handlers de sync existentes (16 handlers permanecen igual)
- Cambiar lógica de sync grouping por `sync_group_id` (ya funciona correctamente)
- WebSocket o realtime sync (se mantiene REST polling)
- Service Worker para offline-first completo

## Verified Context

- **Frontend sync service**: `packages/app/app/lib/sync/sync-service.ts` (1579 líneas) maneja push sync con batching por `sync_group_id` (líneas 617-631)
- **Frontend pull service**: `packages/app/app/lib/sync/pull-service.ts` (370 líneas) aplica cambios secuencialmente en loop (líneas 251-261)
- **Config actual**: `BATCH_SIZE = 50`, `CONCURRENT_OPERATIONS = 5`, `SYNC_INTERVAL_MS = 5000`, `PULL_INTERVAL_MS = 10000`
- **Backend sync endpoint**: `packages/backend/src/api/sync.ts` (380 líneas) con `getChanges` en `sync.service.ts` (líneas 95-166)
- **Backend limites**: `MAX_BATCH_SIZE = 100`, `MAX_CHANGES_LIMIT = 500`, `DEFAULT_CHANGES_LIMIT = 100`
- **Entity priorities**: Definidas en `packages/shared/src/sync-config.ts` con `sales: 1`, `sale_items: 2`, `customers: 1`, etc.
- **Sync status fields**: Todos las tablas sync-capable tienen `sync_status` (`pending`, `synced`, `error`) y `sync_attempts`
- **Existing tests**: `change-applier.test.ts` (340 líneas), `pull-service.test.ts` (507 líneas), `sync-config.test.ts` (58 líneas)
- **Problem identified**: Con 500-600 registros, 10 HTTP requests (batch size 50) + 1000+ queries N+1 + overhead de savepoints = 9-20 segundos

## Assumptions

- Los usuarios rara vez consultan ventas de más de 7 días atrás, pero sí necesitan acceso inmediato a deudas históricas de clientes
- El procesamiento secuencial actual es seguro y no queremos introducir race conditions con concurrencia
- El tiempo de procesamiento secuencial es aceptable si reducimos el número de HTTP requests con batch sizes mayores
- Los cambios de servidor deben aplicarse en el orden recibido para mantener consistencia

## Files Involved

### Create

- `packages/app/app/lib/sync/staged-pull-coordinator.ts` - Create - Orquesta la carga por etapas (crítica, esencial, background) de forma secuencial
- `packages/app/app/hooks/use-staged-sync.ts` - Create - React hook para acceder al estado de carga por etapas
- `packages/app/app/components/sync/staged-sync-indicator.tsx` - Create - UI component para mostrar progreso de etapas
- `packages/shared/src/sync-stages.ts` - Create - Constantes y tipos para SYNC_STAGES (CRITICAL, RECENT_SALES, HISTORICAL)
- `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.test.ts` - Create - Unit tests para StagedPullCoordinator
- `packages/backend/src/services/sync/__tests__/sync-stages.integration.test.ts` - Create - Integration tests para backend endpoint con filtros

### Modify

- `packages/app/app/lib/sync/pull-service.ts` - Modify - Agregar método `pullWithOptions()` para soportar filtrado por entidades y rango de fechas
- `packages/backend/src/services/sync/sync.service.ts` - Modify - Extender `getChanges()` para soportar `entityTypes` y `since` filtros
- `packages/backend/src/api/sync.ts` - Modify - Agregar parsing de query param `entityTypes` en endpoint `/sync/changes`
- `packages/shared/src/sync-config.ts` - Modify - Agregar SYNC_STAGES constant y ENTITY_LOADING_PRIORITIES
- `packages/app/app/lib/sync/config.ts` - Modify - Cambiar `BATCH_SIZE` de 50 a 100

### Review

- `packages/app/app/lib/sync/coordinator.ts` - Review - Verificar integración con StagedPullCoordinator
- `packages/app/app/routes/_protected.tsx` - Review - Verificar dónde iniciar el staged sync (al cargar la app protegida)

## Ordered Execution Steps

### Phase 1: Foundation & Configuration

1. **Actualizar configuración de batch size**
   - Files: `packages/app/app/lib/sync/config.ts`
   - Action: Cambiar `BATCH_SIZE` de 50 a 100. Con 500 registros, esto reduce requests de 10 a 5.
   - Depends on: None

2. **Crear SYNC_STAGES en shared package**
   - Files: `packages/shared/src/sync-stages.ts` (new)
   - Action: Definir constantes CRITICAL (customers, products, 30 días), RECENT_SALES (sales, sale_items, 7 días), HISTORICAL (abonos, purchases, etc., todo histórico). Todas las etapas procesan secuencialmente.
   - Depends on: None

3. **Actualizar sync-config.ts con prioridades**
   - Files: `packages/shared/src/sync-config.ts`
   - Action: Agregar ENTITY_LOADING_PRIORITIES para ordenar consultas del servidor
   - Depends on: Step 2

### Phase 2: Backend Enhancement

4. **Extender getChanges() con filtros**
   - Files: `packages/backend/src/services/sync/sync.service.ts` (líneas 95-166)
   - Action: Agregar parámetro opcional `entityTypes?: string[]` al método `getChanges()`. Modificar query para usar `inArray(syncOperations.entity, entityTypes)` cuando se proporcione. Mantener comportamiento actual como default.
   - Depends on: None

5. **Actualizar endpoint /sync/changes**
   - Files: `packages/backend/src/api/sync.ts` (líneas 153-206)
   - Action: Parsear query param `entityTypes` (split by comma) y pasar a `syncService.getChanges()`. Mantener backward compatibility: si no se envía entityTypes, comportamiento actual sin filtro.
   - Depends on: Step 4

6. **Crear integration tests para backend**
   - Files: `packages/backend/src/services/sync/__tests__/sync-stages.integration.test.ts` (new)
   - Action: Tests para verificar que `entityTypes` filter funciona correctamente y que `since` + `entityTypes` combinan correctamente
   - Depends on: Step 5

### Phase 3: Frontend Core Implementation

7. **Modificar pull-service.ts con método de filtros**
   - Files: `packages/app/app/lib/sync/pull-service.ts` (líneas 140-180 aprox)
   - Action: Crear método `pullWithOptions(options: { entityTypes?: string[], since?: string })` que permite especificar entidades y rango de fechas. Mantener método `pull()` existente para backward compatibility (usa pullWithOptions sin filtros).
   - Depends on: None

8. **Crear StagedPullCoordinator (secuencial)**
   - Files: `packages/app/app/lib/sync/staged-pull-coordinator.ts` (new)
   - Action: Implementar clase con métodos: `loadCriticalData()`, `loadRecentSales()`, `loadHistoricalData()`, `executeStagedLoad()`. Todo el procesamiento es secuencial usando loops `for...of` como el código actual. No usar concurrencia.
   - Depends on: Step 2, Step 7

### Phase 4: UI Integration

9. **Crear hook useStagedSync**
   - Files: `packages/app/app/hooks/use-staged-sync.ts` (new)
   - Action: React hook que expone estado de carga por etapas: `{ critical: 'loading'|'complete', recent: 'loading'|'complete', historical: 'loading'|'complete'|error, progress: number }`
   - Depends on: Step 8

10. **Crear componente StagedSyncIndicator**
    - Files: `packages/app/app/components/sync/staged-sync-indicator.tsx` (new)
    - Action: Componente UI que muestra: 1) barra de progreso de etapas, 2) indicadores de estado (crítico/esencial/background), 3) "X registros cargados". Usar diseño consistente con el sistema de componentes existente.
    - Depends on: Step 9

11. **Integrar en ruta protegida**
    - Files: `packages/app/app/routes/_protected.tsx`
    - Action: Iniciar `StagedPullCoordinator.executeStagedLoad()` al montar el componente. Renderizar `<StagedSyncIndicator />` condicionalmente mientras carga las etapas críticas y esenciales. Ocultar cuando app sea usable.
    - Depends on: Step 9, Step 10

### Phase 5: Testing & Validation

12. **Unit tests para StagedPullCoordinator**
    - Files: `packages/app/app/lib/sync/__tests__/staged-pull-coordinator.test.ts` (new)
    - Action: Tests para: 1) orden correcto de ejecución (crítica → esencial → background), 2) manejo de errores en una etapa, 3) progreso reportado correctamente, 4) procesamiento secuencial (no paralelo)
    - Depends on: Step 8

13. **Integration test end-to-end**
    - Files: `packages/app/e2e/staged-sync.spec.ts` (new) o extender tests existentes
    - Action: Test de playwright que: 1) simula login, 2) verifica que staged loading indicator aparece, 3) verifica que app es usable antes de completar background load, 4) verifica que todas las etapas completan eventualmente
    - Depends on: Step 11

14. **Performance testing**
    - Files: `packages/app/app/lib/sync/__tests__/performance.sync.test.ts` (new)
    - Action: Benchmark que mide: 1) tiempo de carga inicial con staged loading, 2) tiempo de carga completa, 3) número de HTTP requests realizados
    - Depends on: Steps 1, 8

### Phase 6: Documentation

15. **Documentación de sync stages**
    - Files: `docs/technical/sync-stages.md` (new)
    - Action: Documentar la arquitectura de staged sync, cómo funciona, cómo debuggear, métricas esperadas. Incluir diagrama del flujo de 3 etapas.
    - Depends on: All previous steps

## Risks and Edge Cases

### Riesgos Técnicos

1. **Etapa falla pero otras continúan**: Si `loadHistoricalData()` falla, no debe afectar la operación normal de la app. **Mitigación**: Cada etapa tiene try/catch independiente, errores de background se loggean pero no bloquean. La app es usable después de las 2 primeras etapas.

2. **Usuario offline durante carga**: Si el usuario se desconecta durante la carga de una etapa, debe poder reanudar desde donde quedó. **Mitigación**: Guardar cursor parcial por etapa en localStorage (ej: `sync_cursor_critical`, `sync_cursor_recent`, `sync_cursor_historical`), no solo un cursor global.

3. **Cambios simultáneos durante staged load**: Si el servidor recibe cambios nuevos mientras el cliente está en etapa 2, el cursor debe avanzar correctamente. **Mitigación**: Siempre avanzar cursor al final de cada batch exitoso, no solo al final de etapa.

4. **Navegación entre tabs**: Si el usuario cambia de tab durante carga, los requests deben cancelarse o manejarse graceful. **Mitigación**: Usar `AbortController` para cancelar requests de fetch, manejar errores de cancelación silenciosamente.

### Edge Cases

1. **Usuario cierra app durante background**: Si el usuario cierra la app durante `loadHistoricalData()`, al reabrir debe continuar desde el cursor guardado de esa etapa. **Mitigación**: Guardar cursor por etapa en localStorage, cargar último cursor al iniciar cada etapa.

2. **Sin datos en una etapa**: Si no hay ventas en los últimos 7 días, la etapa "Reciente" debe completar inmediatamente sin error. **Mitigación**: Verificar `changes.length === 0` y marcar etapa como complete.

3. **Timeout de etapa**: Si una etapa tarda más de X segundos, debe reportar error para no bloquear indefinidamente. **Mitigación**: Agregar timeout por etapa (ej: 30 segundos), reportar error si excede.

## Validation Strategy

### Unit Tests (Coverage target: 80%+ para nuevos archivos)

- `staged-pull-coordinator.test.ts`: Verificar orden de ejecución, manejo de errores, progreso, secuencialidad
- `sync-stages.integration.test.ts`: Verificar endpoint con filtros funciona, backward compatibility

### Integration Tests

- **E2E con Playwright**: Flujo completo: login → ver staged indicator → esperar completar → verificar datos cargados
- **Sync race test**: Simular operaciones simultáneas de push y pull, verificar consistencia

### Manual Validation

1. **Performance**: Medir tiempo de carga con 500, 1000, 2000 registros. Target: < 5s para datos críticos, < 30s para completo.
2. **Offline/Online transition**: Desconectar durante carga, reconectar, verificar reanuda correctamente.
3. **Mobile device**: Probar en device real (no emulador) con network throttling.

### Lint & Typecheck

- `bun run typecheck` en `packages/app` y `packages/backend` debe pasar sin errores
- `bun run lint` debe pasar sin errores de estilo
- No console.logs de debug en código de producción

## Open Questions

1. **¿Guardar progreso parcial por etapa?**: Si el usuario cierra la app durante `loadHistoricalData()` al 50%, ¿deberíamos guardar "estoy en etapa HISTORICAL, cursor XYZ, ya cargué 250" o reiniciar la etapa completa desde 0? **Recomendación**: Guardar cursor por etapa para reanudar eficientemente.

2. **¿Batch sizes diferentes por etapa?**: Las etapas críticas podrían usar batch más pequeño (50) para mostrar progreso rápido, background podría usar batch más grande (200). **Recomendación**: Mantener uniforme (100) en primera versión, optimizar si es necesario después de métricas reales.

3. **¿Timeout por etapa?**: Si `loadHistoricalData()` tarda más de 60 segundos, ¿debe cancelarse y reportar error o continuar intentando? **Recomendación**: Agregar timeout de 60s por etapa, reportar error pero permitir reintentar manualmente.

4. **¿Reintentos automáticos por etapa?**: Si una etapa falla, ¿debe reintentar automáticamente con backoff o esperar al próximo ciclo de sync? **Recomendación**: Reintentar inmediatamente 1-2 veces, luego esperar al próximo ciclo automático.

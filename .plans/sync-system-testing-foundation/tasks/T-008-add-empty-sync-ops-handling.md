# T-008: Agregar empty sync_operations handling

## Objetivo
Manejar gracefully el scenario donde `sync_operations` está vacía (no hay registros con `status = "processed"`), mostrando error accionable en la UI.

## Archivos a Modificar
- `packages/app/app/lib/sync/staged-pull-coordinator.ts`
- `packages/app/app/routes/sync.tsx`

## Changes Requeridos

### 1. En StagedPullCoordinator - Detectar y reportar

```typescript
// Nuevo método
async checkSyncHealth(): Promise<{
  hasData: boolean;
  entityCounts: Record<string, number>;
  recommendation?: string;
}> {
  // Try a minimal pull to check if there's data
  const result = await this.pullService.pullWithOptions({
    entityTypes: ["customers"], // Just check one entity
    limit: 1,
  });

  if (result.changesApplied === 0 && !result.hasMore) {
    return {
      hasData: false,
      entityCounts: {},
      recommendation: "sync_operations_empty",
    };
  }

  return {
    hasData: true,
    entityCounts: {},
  };
}
```

### 2. En SyncPage - Mostrar error accionable

```typescript
// En performInitialSync(), después de inicializar DB:

// Check if sync data exists before starting staged load
const health = await coordinator.checkSyncHealth();

if (!health.hasData) {
  setError(
    "No hay datos para sincronizar. Esto puede ocurrir si nunca se ha usado este dispositivo con este negocio. " +
    "Por favor, contacta al administrador del negocio para verificar que la cuenta tiene datos sincronizados."
  );
  setSyncProgress({
    stage: "error",
    message: "Sin datos de referencia",
  });
  return;
}
```

### 3. Mejorar mensaje de 0 registros

```typescript
// En el callback de progress, cuando changesApplied es 0:

if (state.changesApplied === 0 && state.status === "loading") {
  // This is the stuck scenario!
  // After 3 seconds, show warning
  if (!this.zeroDataWarningShown) {
    this.zeroDataWarningShown = true;
    setSyncProgress(prev => ({
      ...prev,
      message: "Descargando información... (0 registros - esto es anormal)",
    }));
  }
}
```

### 4. Sugerencia de backfill

```typescript
// En el mensaje de error final:

const errorMessage = `
  No se encontraron datos de referencia.

  Possible causes:
  1. La cuenta no tiene datos sincronizados aún
  2. Error en el script de backfill del servidor

  Solución: Contacta al administrador para ejecutar el script de backfill:
  bun run src/seed/backfill-sync-operations.ts --business-id ${businessId}
`;
```

## Criterios de Aceptación

- [ ] UI muestra error claro cuando sync_operations está vacía
- [ ] Mensaje incluye posible causa y solución
- [ ] No muestra "0 registros" sin contexto
- [ ] Sugiere backfill cuando aplica

## Dependencias
- T-007 (loop protection - para detectar stuck state)

## Notas
- El error debe ser accionable, no solo un mensaje de "sin datos"
- Incluir businessId en el mensaje para soporte
- Considerar mostrar diagnostico en modo dev (cursor, counts)

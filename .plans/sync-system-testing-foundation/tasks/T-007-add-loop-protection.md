# T-007: Agregar loop protection

## Objetivo
Implementar protección contra loops infinitos en `StagedPullCoordinator` y `PullService` para evitar que el sync se quede "plantado".

## Archivos a Modificar
- `packages/app/app/lib/sync/staged-pull-coordinator.ts`
- `packages/app/app/lib/sync/pull-service.ts`

## Changes Requeridos

### 1. Constants en StagedPullCoordinator

```typescript
// Agregar al inicio del archivo
const MAX_ITERATIONS_PER_STAGE = 100;
const STAGE_TIMEOUT_MS = 30000;
const MAX_CONSECUTIVE_EMPTY_RESPONSES = 3;
```

### 2. Tracking en clase

```typescript
private iterationsThisStage = 0;
private stageStartTime = 0;
private consecutiveEmptyResponses = 0;
```

### 3. En loadCriticalData, loadRecentSales, loadHistoricalData

```typescript
async loadCriticalData(): Promise<StagedPullState> {
  this.iterationsThisStage = 0;
  this.stageStartTime = Date.now();
  this.consecutiveEmptyResponses = 0;

  // En el while loop:
  while (hasMore) {
    // Check max iterations
    if (++this.iterationsThisStage > MAX_ITERATIONS_PER_STAGE) {
      throw new Error(
        `Max iterations (${MAX_ITERATIONS_PER_STAGE}) reached for stage CRITICAL. ` +
        `Last cursor: ${lastCursor}. Check if backend is returning hasMore:true with empty data.`
      );
    }

    // Check timeout
    if (Date.now() - this.stageStartTime > STAGE_TIMEOUT_MS) {
      throw new Error(
        `Stage CRITICAL timed out after ${STAGE_TIMEOUT_MS}ms. ` +
        `Progress: ${this.iterationsThisStage} iterations.`
      );
    }

    // ... existing pull logic

    // Track consecutive empty responses
    if (result.changesApplied === 0) {
      this.consecutiveEmptyResponses++;
      if (this.consecutiveEmptyResponses >= MAX_CONSECUTIVE_EMPTY_RESPONSES) {
        // Treat as "no more data" to prevent stuck state
        console.warn(`[StagedPull] Stage CRITICAL: ${MAX_CONSECUTIVE_EMPTY_RESPONSES} consecutive empty responses. Ending stage.`);
        hasMore = false;
        break;
      }
    } else {
      this.consecutiveEmptyResponses = 0;
    }
  }
}
```

### 4. En PullService.pullWithOptions

```typescript
// Agregar tracking de consecutive empty responses
if (changes.length === 0 && hasMore) {
  // This is the dangerous state - hasMore but no data
  // Add to response so coordinator can handle
}
```

### 5. Expose getters para debugging

```typescript
getIterationCount(): number {
  return this.iterationsThisStage;
}

getStageElapsedMs(): number {
  return Date.now() - this.stageStartTime;
}
```

## Criterios de Aceptación

- [ ] Sin loop infinito posible (MAX_ITERATIONS enforced)
- [ ] Timeout por etapa (STAGE_TIMEOUT_MS enforced)
- [ ] Consecutive empty responses detectadas
- [ ] Error messages claros y accionables
- [ ] Tests cubren estos edge cases

## Dependencias
- T-003 (unit tests para detectar regresiones)

## Notas
- No cambiar comportamiento normal - solo agregar protecciones
- Errores deben ser informativos (no solo "Error")
- Considerar agregar métricas para monitoreo
- El fix de T-008 (empty sync_operations) trabaja junto con este

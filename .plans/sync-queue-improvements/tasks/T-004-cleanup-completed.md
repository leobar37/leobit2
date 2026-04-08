# T-004 Add cleanupCompleted Method

## Objective

Agregar un método `cleanupCompleted(olderThanDays: number)` a `ISyncQueue` y `PgSyncQueue` que elimine operaciones con `status = 'completed'` cuya `updated_at` sea anterior a la fecha calculada.

## Requirements Covered

- `FR-004`

## Dependencies

- T-001

## Files or Areas Involved

- `packages/app/app/lib/sync/queue/sync-queue.ts` — Modify — agregar método a interfaz
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts` — Modify — implementar SQL DELETE
- `packages/app/app/lib/sync/testing/mocks.ts` — Modify — implementar en mock
- `packages/app/app/lib/sync/cleanup-service.ts` — Review — punto de invocation

## Actions

1. En `ISyncQueue`, agregar:
   ```typescript
   cleanupCompleted(olderThanDays: number): Promise<number>;
   ```
2. En `PgSyncQueue`, implementar:
   ```typescript
   async cleanupCompleted(olderThanDays: number): Promise<number> {
     const cutoff = new Date();
     cutoff.setDate(cutoff.getDate() - olderThanDays);
     const result = await this.pg.query(
       `DELETE FROM sync_operations
        WHERE business_id = $1
          AND status = $2
          AND updated_at < $3`,
       [this.businessId, OPERATION_STATUS.COMPLETED, cutoff.toISOString()]
     );
     return result.affectedRows ?? 0;
   }
   ```
3. Invocar desde `CleanupService` en el scope `logout` o `business_switch`
4. Actualizar `MockSyncQueue` con implementación que mantenga estado interno

## Completion Criteria

- `cleanupCompleted(7)` elimina operaciones completadas de más de 7 días
- No elimina operaciones pending, failed o dead-letter

## Validation

- Test: crear 3 operaciones completadas (1 vieja, 1 reciente, 1 con status=pending) y llamar cleanup; solo la vieja y reciente completadas se eliminan
- `bun test` pasa

## Risks or Notes

- Mantener el default en 7 días para no eliminar operaciones que podrían necesitarse para debugging

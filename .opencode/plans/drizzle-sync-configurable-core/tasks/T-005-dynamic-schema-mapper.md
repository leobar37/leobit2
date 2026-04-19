# T-005: Refactorizar `schema-mapper` para usar config

## Requirement IDs
- FR-013, FR-014, FR-015, FR-016, FR-017

## Objective
Eliminar `VALID_TABLES` y `TABLE_COLUMNS` hardcodeados de `schema-mapper.ts` y hacer que funcionen con configuración dinámica de entidades.

## Files to Modify

1. `packages/drizzle-sync/src/pglite/schema-mapper.ts`

## Implementation

### Nueva API del Schema Mapper

```typescript
/**
 * Schema Mapper - Dynamic Version
 * 
 * Creates schema validation functions from entity configuration.
 */

import type { EntityConfig } from "../config/types";

export interface SchemaMapper<TEntity extends string> {
  isValidTableName: (tableName: string) => boolean;
  isValidColumn: (tableName: string, column: string) => boolean;
  getTableColumns: (tableName: string) => Set<string> | null;
  filterValidColumns: (tableName: string, payload: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Create schema mapper from entity configuration
 */
export function createSchemaMapper<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): SchemaMapper<TEntity> {
  // Build lookup tables from config
  const validTables = new Set(Object.values(entities).map(e => e.tableName));
  const tableColumns: Record<string, Set<string>> = {};
  
  for (const config of Object.values(entities)) {
    tableColumns[config.tableName] = new Set(config.fields);
  }

  return {
    isValidTableName(tableName: string): boolean {
      return validTables.has(tableName);
    },

    isValidColumn(tableName: string, column: string): boolean {
      const columns = tableColumns[tableName];
      return columns ? columns.has(column) : false;
    },

    getTableColumns(tableName: string): Set<string> | null {
      return tableColumns[tableName] ?? null;
    },

    filterValidColumns(
      tableName: string,
      payload: Record<string, unknown>
    ): Record<string, unknown> {
      const validColumns = tableColumns[tableName];
      if (!validColumns) {
        console.warn(`[SchemaMapper] Unknown table: ${tableName}`);
        return payload;
      }

      const filtered: Record<string, unknown> = {};
      const removed: string[] = [];

      for (const [key, value] of Object.entries(payload)) {
        if (validColumns.has(key)) {
          filtered[key] = value;
        } else {
          removed.push(key);
        }
      }

      if (removed.length > 0) {
        console.warn(`[SchemaMapper] Ignored columns for ${tableName}: ${removed.join(', ')}`);
      }

      return filtered;
    },
  };
}

// Backwards compatibility exports (deprecated)
/**
 * @deprecated Use createSchemaMapper(config) instead
 */
export const VALID_TABLES: Set<string> = new Set();

/**
 * @deprecated Use createSchemaMapper(config) instead  
 */
export function isValidTableName(): boolean {
  throw new Error('isValidTableName now requires config. Use createSchemaMapper(config).isValidTableName()');
}

/**
 * @deprecated Use createSchemaMapper(config) instead
 */
export function isValidColumn(): boolean {
  throw new Error('isValidColumn now requires config. Use createSchemaMapper(config).isValidColumn()');
}

/**
 * @deprecated Use createSchemaMapper(config) instead
 */
export function filterValidColumns(): Record<string, unknown> {
  throw new Error('filterValidColumns now requires config. Use createSchemaMapper(config).filterValidColumns()');
}
```

## Acceptance Criteria

- [ ] `createSchemaMapper` crea validador dinámico desde config
- [ ] No más hardcodeo de tablas/columnas en el código
- [ ] Funciones antiguas lanzan error instructivo
- [ ] Tests actualizados

## Time Estimate

4 horas

# T-002: Crear PGlite test doubles

## Objetivo
Crear mocks y test doubles para PGlite que permitan tests unitarios sin necesidad de una instancia real de PGlite.

## Archivos a Crear
- `packages/app/tests/mocks/pglite-mock.ts`
- `packages/app/tests/mocks/pglite-query-result.ts`

## Mock de PGlite

```typescript
// Estructura del mock
interface PGliteMock {
  query: vi.fn<[string, unknown[]], Promise<QueryResult>>;
  exec: vi.fn<[string], Promise<void>>;
  transaction: vi.fn<[callback: (tx: TransactionMock) => Promise<void>], Promise<void>>;
}

// Transaction mock
interface TransactionMock {
  query: vi.fn<[string, unknown[]], Promise<QueryResult>>;
  exec: vi.fn<[string], Promise<void>>;
}
```

## Pasos de Implementación

1. Crear `packages/app/tests/mocks/pglite-mock.ts`
2. Implementar `createPGliteMock()` que retorna un objeto con:
   - `query()` - retorna Promise que resuelve a `QueryResult`
   - `exec()` - retorna Promise que resuelve a void
   - `transaction()` - envolvía callback en transacción
3. Crear helper `setupQueryResponse(table, rows)` para configurar respuestas
4. Crear helper `setupQueryError(table, error)` para simular errores
5. Exportar tipos `QueryResult`, `QueryResultRow`

## Helpers a Implementar

```typescript
// Configura respuesta de query para una tabla específica
export function setupTableQuery(
  mockPg: PGliteMock,
  tableName: string,
  rows: Record<string, unknown>[]
): void

// Configura respuesta vacía
export function setupEmptyTable(
  mockPg: PGliteMock,
  tableName: string
): void

// Configura error en query
export function setupQueryError(
  mockPg: PGliteMock,
  tableName: string,
  error: string
): void
```

## Criterios de Aceptación

- [ ] Mock puede reemplazar PGlite real en tests
- [ ] `query()` retorna Promise con rows
- [ ] `exec()` retorna Promise sin error
- [ ] helpers permiten setup de respuestas específicas
- [ ] Tests existentes de change-applier pueden usar el mock

## Dependencias
- T-001 (interfaces para DI)

## Notas
- No necesita persistencia real - todo en memoria
- Debe ser compatible con la API de PGlite real
- Considerar `vi.mock` para isolates imports de `@electric-sql/pglite`

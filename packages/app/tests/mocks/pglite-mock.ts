/**
 * PGlite Test Doubles
 * 
 * Mock implementations for PGlite that allow unit testing without
 * requiring a real PGlite instance or IndexedDB.
 */

import { vi } from "vitest";

export interface QueryResultRow {
  [key: string]: unknown;
}

export interface QueryResult {
  rows: QueryResultRow[];
  fields?: Array<{ name: string }>;
}

export interface PGliteMock {
  query: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

interface QueryHandler {
  response: QueryResult;
  delay?: number;
}

type QueryHandlerFn = (sql: string, params?: unknown[]) => QueryResult | Promise<QueryResult>;

/**
 * Creates a mock PGlite instance that stores responses in memory.
 * 
 * @example
 * const mockPg = createPGliteMock();
 * 
 * // Setup a query response
 * mockPg.query.mockResolvedValueOnce({
 *   rows: [{ id: '1', name: 'Test' }],
 *   fields: [{ name: 'id' }, { name: 'name' }]
 * });
 * 
 * // Or use setupQuery to configure by SQL pattern
 * setupQuery(mockPg, 'SELECT', (sql, params) => ({
 *   rows: [{ id: params[0] }],
 * }));
 */
export function createPGliteMock(): PGliteMock {
  return {
    query: vi.fn(),
    exec: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Setup a query response for a specific SQL pattern.
 * 
 * @param mockPg - The mock PGlite instance
 * @param sqlPattern - SQL keyword or pattern to match (SELECT, INSERT, UPDATE, DELETE)
 * @param handler - Function that returns the result based on SQL and params
 */
export function setupQuery(
  mockPg: PGliteMock,
  sqlPattern: string,
  handler: QueryHandlerFn
): void {
  mockPg.query.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes(sqlPattern)) {
      return handler(sql, params);
    }
    return { rows: [], fields: [] };
  });
}

/**
 * Setup a table to return specific rows.
 * 
 * @param mockPg - The mock PGlite instance
 * @param tableName - Name of the table
 * @param rows - Rows to return
 */
export function setupTableQuery(
  mockPg: PGliteMock,
  tableName: string,
  rows: QueryResultRow[]
): void {
  mockPg.query.mockImplementation(async (sql: string) => {
    if (sql.includes(`"${tableName}"`) || sql.includes(tableName)) {
      return { rows, fields: [] };
    }
    return { rows: [], fields: [] };
  });
}

/**
 * Setup an empty response for a table.
 */
export function setupEmptyTable(mockPg: PGliteMock, tableName: string): void {
  setupTableQuery(mockPg, tableName, []);
}

/**
 * Setup an error response for a query.
 */
export function setupQueryError(
  mockPg: PGliteMock,
  sqlPattern: string,
  error: string
): void {
  const originalImpl = mockPg.query.getMockImplementation();
  mockPg.query.mockImplementation(async (sql: string) => {
    if (sql.includes(sqlPattern)) {
      throw new Error(error);
    }
    if (originalImpl) {
      return originalImpl(sql);
    }
    return { rows: [], fields: [] };
  });
}

/**
 * Setup INSERT/UPDATE/DELETE to return success.
 */
export function setupWriteSuccess(mockPg: PGliteMock): void {
  mockPg.query.mockResolvedValue({ rows: [], fields: [] });
}

/**
 * Create a transaction mock.
 * 
 * @param mockPg - The mock PGlite instance
 * @param txResults - Results to return from transaction callbacks
 */
export function setupTransaction(
  mockPg: PGliteMock,
  txResults: QueryResult[] = []
): void {
  let callIndex = 0;
  mockPg.transaction.mockImplementation(async (callback: (tx: TransactionMock) => Promise<void>) => {
    const tx = createTransactionMock(txResults[callIndex] || { rows: [] });
    callIndex++;
    await callback(tx);
  });
}

/**
 * Create a transaction mock.
 */
export function createTransactionMock(result: QueryResult = { rows: [] }): TransactionMock {
  return {
    query: vi.fn().mockResolvedValue(result),
    exec: vi.fn().mockResolvedValue(undefined),
  };
}

export interface TransactionMock {
  query: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
}

/**
 * Helper to create a mock for applyChange tests.
 * 
 * Simulates the actual SQL behavior:
 * - SELECT for existing record
 * - INSERT or UPDATE based on result
 */
export function setupApplyChangeMock(
  mockPg: PGliteMock,
  existingRows: QueryResultRow[]
): void {
  let callCount = 0;
  mockPg.query.mockImplementation(async (sql: string) => {
    callCount++;
    if (sql.includes("SELECT")) {
      return { rows: existingRows, fields: [] };
    }
    // For INSERT/UPDATE/DELETE, return success
    return { rows: [], fields: [] };
  });
}

/**
 * Reset all mocks on a PGlite mock.
 */
export function resetPGliteMock(mockPg: PGliteMock): void {
  mockPg.query.mockReset();
  mockPg.exec.mockReset();
  mockPg.transaction.mockReset();
  mockPg.close.mockReset();
}

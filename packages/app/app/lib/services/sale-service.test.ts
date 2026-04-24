import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { SyncClientEngineLike } from "./base-service";
import { SaleService, type CreateSaleInput, type CreateSaleItemInput } from "./sale-service";

const mockSyncService = {
  enqueue: vi.fn().mockResolvedValue("op-1"),
  processPending: vi.fn().mockResolvedValue({ processed: 0, failed: 0, conflicts: 0 }),
  getPendingCount: vi.fn().mockResolvedValue(0),
  getConflicts: vi.fn().mockResolvedValue([]),
};

const createMockPg = () => {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue(undefined),
  } as unknown as PGlite;
};

const createMockDb = () => {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
  } as unknown as ReturnType<typeof drizzle>;
};

function createMockEngine(
  pg: PGlite,
  db: ReturnType<typeof drizzle>,
  businessId: string,
  businessUserId: string,
): SyncClientEngineLike {
  return {
    getPg: () => pg,
    getDb: () => db,
    getSyncOperations: () => mockSyncService as any,
    getConfig: () => ({ tenantId: businessId, userId: businessUserId }),
  };
}

describe("SaleService FK Reference Migration", () => {
  let service: SaleService;
  let mockPg: PGlite;
  let mockDb: ReturnType<typeof drizzle>;

  const businessId = "biz-123";
  const businessUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPg = createMockPg();
    mockDb = createMockDb();
    service = new SaleService(createMockEngine(mockPg, mockDb, businessId, businessUserId));
  });
});

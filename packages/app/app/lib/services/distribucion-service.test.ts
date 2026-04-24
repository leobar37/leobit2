/**
 * Unit tests for DistribucionService
 * Tests atomic items operations and FK reference usage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import type { SyncClientEngineLike } from "./base-service";
import { DistribucionService, type CreateDistribucionInput, type CreateDistribucionItemInput } from "./distribucion-service";
import type { Distribucion } from "@avileo/shared";

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

describe("DistribucionService", () => {
  let service: DistribucionService;
  let mockPg: PGlite;
  let mockDb: ReturnType<typeof drizzle>;

  const businessId = "biz-123";
  const businessUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPg = createMockPg();
    mockDb = createMockDb();
    service = new DistribucionService(createMockEngine(mockPg, mockDb, businessId, businessUserId));
  });

  describe("createWithItems", () => {
    it("should create distribucion with items atomically using FK references", async () => {
      // Setup mock for distribucion insert
      mockPg.query
        .mockResolvedValueOnce({ rows: [] }) // INSERT distribucion
        .mockResolvedValueOnce({ rows: [{ id: "dist-1" }] }); // SELECT after insert

      const input: CreateDistribucionInput = {
        vendedorId: "vendedor-1",
        puntoVenta: "Mercado Central",
        puntoVentaId: "pv-1",
        notaCreacion: "Primera distribución del día",
        fecha: "2026-04-20",
        items: [
          { variantId: "var-1", cantidadAsignada: 10, unidad: "kg" },
          { variantId: "var-2", cantidadAsignada: 5, unidad: "kg" },
        ],
      };

      const result = await service.createWithItems(input);

      // Verify distribucion was inserted
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO distribuciones"),
        expect.arrayContaining([
          expect.any(String), // id
          businessId, // business_id
          "vendedor-1", // vendedor_id
          "Mercado Central", // punto_venta
        ])
      );

      // Verify items were inserted with FK reference (distribucion_id in payload)
      const itemInsertCalls = mockPg.query.mock.calls.filter((call) =>
        call[0]?.includes("INSERT INTO distribucion_items")
      );
      expect(itemInsertCalls).toHaveLength(2);

      // Verify sync was queued for parent first, then children
      expect(mockSyncService.enqueue).toHaveBeenCalledTimes(3); // 1 distribucion + 2 items
    });

    it("should queue items with FK reference (distribucionId)", async () => {
      mockPg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "dist-new" }] });

      const input: CreateDistribucionInput = {
        vendedorId: "vendedor-1",
        puntoVenta: "Tienda Principal",
        items: [{ variantId: "var-x", cantidadAsignada: 15, unidad: "kg" }],
      };

      await service.createWithItems(input);

      // queueSync passes object with named properties, not positional
      const itemEnqueueCall = mockSyncService.enqueue.mock.calls.find(
        (call) => call[0]?.entity_type === "distribucion_items"
      );

      expect(itemEnqueueCall).toBeDefined();
      expect(itemEnqueueCall[0].data).toMatchObject({
        distribucionId: expect.any(String),
        variantId: "var-x",
        cantidadAsignada: 15,
      });
    });

    it("should create distribucion without items", async () => {
      mockPg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "dist-no-items" }] });

      const input: CreateDistribucionInput = {
        vendedorId: "vendedor-2",
        puntoVenta: "Tienda secondary",
      };

      const result = await service.createWithItems(input);

      // Only 1 sync call for the distribucion (no items)
      expect(mockSyncService.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe("create (override)", () => {
    it("should delegate to createWithItems for atomic operations", async () => {
      mockPg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "dist-delegated" }] });

      const input = {
        vendedorId: "vendedor-3",
        puntoVenta: "Delegated Punto",
        fecha: "2026-04-20",
      };

      await service.create(input);

      // Should have called createWithItems (evidenced by item-related queries if items provided)
      // Without items, only 1 sync call for distribucion
      expect(mockSyncService.enqueue).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * Tests for VisitaService enriched return types
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { VisitaService, type VisitaWithCustomer } from "./visita-service";

// Mock dependencies
const mockPg = {} as PGlite;
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as ReturnType<typeof drizzle>;
const mockSyncService = {
  enqueue: vi.fn().mockResolvedValue("op_123"),
  processPending: vi.fn(),
} as any;
const mockBusinessId = "bus_123";
const mockBusinessUserId = "user_123";

describe("VisitaService", () => {
  let service: VisitaService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VisitaService(
      mockPg,
      mockDb,
      mockSyncService,
      mockBusinessId,
      mockBusinessUserId
    );
  });

  describe("findById", () => {
    it("should return VisitaWithCustomer with customer data", async () => {
      const mockVisita = {
        id: "vis_123",
        distribucionId: "dist_123",
        customerId: "cus_123",
        vendedorId: mockBusinessUserId,
        status: "pendiente" as const,
        motivoNoCompra: null,
        saleId: null,
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCustomer = {
        id: "cus_123",
        name: "Juan Perez",
        dni: "12345678",
        address: "Calle 123",
        phone: "999888777",
      };

      // Mock the database query
      vi.spyOn(mockDb, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                ...mockVisita,
                customer: mockCustomer,
              }]),
            }),
          }),
        }),
      } as any);

      const result = await service.findById("vis_123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("vis_123");
      expect(result?.customer).toBeDefined();
      expect(result?.customer?.name).toBe("Juan Perez");
    });

    it("should return null when visita not found", async () => {
      vi.spyOn(mockDb, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const result = await service.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByBusiness", () => {
    it("should return array of VisitaWithCustomer", async () => {
      const mockVisitas = [
        {
          id: "vis_1",
          distribucionId: "dist_1",
          customerId: "cus_1",
          vendedorId: mockBusinessUserId,
          status: "pendiente" as const,
          motivoNoCompra: null,
          saleId: null,
          syncStatus: "pending",
          syncAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          customer: {
            id: "cus_1",
            name: "Cliente 1",
            dni: "11111111",
            address: "Dir 1",
            phone: "111111111",
          },
        },
        {
          id: "vis_2",
          distribucionId: "dist_1",
          customerId: "cus_2",
          vendedorId: mockBusinessUserId,
          status: "compro" as const,
          motivoNoCompra: null,
          saleId: "sale_1",
          syncStatus: "synced",
          syncAttempts: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          customer: {
            id: "cus_2",
            name: "Cliente 2",
            dni: "22222222",
            address: "Dir 2",
            phone: "222222222",
          },
        },
      ];

      vi.spyOn(mockDb, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockVisitas),
            }),
          }),
        }),
      } as any);

      const result = await service.findByBusiness();

      expect(result).toHaveLength(2);
      expect(result[0].customer?.name).toBe("Cliente 1");
      expect(result[1].status).toBe("compro");
    });
  });

  describe("enriched return types", () => {
    it("should include customer data in return types", async () => {
      const mockVisita = {
        id: "vis_123",
        distribucionId: "dist_123",
        customerId: "cus_123",
        vendedorId: mockBusinessUserId,
        status: "pendiente" as const,
        motivoNoCompra: null,
        saleId: null,
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: "cus_123",
          name: "Test Customer",
          dni: "12345678",
          address: "Test Address",
          phone: "999888777",
        },
      };

      vi.spyOn(mockDb, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockVisita]),
            }),
          }),
        }),
      } as any);

      const result = await service.findById("vis_123");

      // Verify the return type includes customer
      expect(result).toHaveProperty("customer");
      expect(result?.customer).toHaveProperty("name");
      expect(result?.customer).toHaveProperty("dni");
      expect(result?.customer).toHaveProperty("address");
      expect(result?.customer).toHaveProperty("phone");
    });
  });
});

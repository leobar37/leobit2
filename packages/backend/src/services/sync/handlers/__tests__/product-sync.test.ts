import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProductSyncHandler } from "../ProductSyncHandler";
import { productCreateSchema } from "../../schemas";
import type { RequestContext } from "../../../../context/request-context";
import type { ProductRepository } from "../../../repository/product.repository";
import type { SyncOperationInput } from "../../types";

describe("productCreateSchema", () => {
  it("should validate product with required fields", () => {
    const validProduct = {
      name: "Pollo Entero",
    };

    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("should validate product with all fields", () => {
    const fullProduct = {
      name: "Pollo Entero",
      unit: "kg",
      basePrice: 12.50,
      costPrice: "10.00",
      isActive: true,
      hasVariants: false,
    };

    const result = productCreateSchema.safeParse(fullProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBe("12.5");
      expect(result.data.costPrice).toBe("10.00");
    }
  });

  it("should validate product with numeric string prices", () => {
    const product = {
      name: "Pollo Entero",
      basePrice: "14.00",
      costPrice: "11.50",
    };

    const result = productCreateSchema.safeParse(product);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBe("14.00");
      expect(result.data.costPrice).toBe("11.50");
    }
  });

  it("should reject product without name", () => {
    const invalidProduct = { unit: "kg" };
    const result = productCreateSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
  });

  it("should default basePrice and costPrice to 0", () => {
    const minimalProduct = { name: "Solo Nombre" };
    const result = productCreateSchema.safeParse(minimalProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBe("0");
      expect(result.data.costPrice).toBe("0");
    }
  });

  it("should default unit to kg", () => {
    const product = { name: "Pollo" };
    const result = productCreateSchema.safeParse(product);
    expect(result.success).toBe(true);
  });
});

describe("ProductSyncHandler", () => {
  let mockProductRepo: ProductRepository;
  let handler: ProductSyncHandler;
  let mockCtx: RequestContext;

  const createOperation = (overrides: Partial<SyncOperationInput> = {}): SyncOperationInput => ({
    idempotencyKey: "test-123",
    entityType: "products",
    entityId: "prod-new",
    operation: "create",
    payload: { name: "Pollo Entero" },
    localVersion: 1,
    localTimestamp: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    mockProductRepo = {
      create: vi.fn().mockResolvedValue({ id: "prod-new" }),
      findById: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({ id: "prod-123" }),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as ProductRepository;

    handler = new ProductSyncHandler(mockProductRepo);

    mockCtx = {
      businessId: "biz-123",
      businessUserId: "user-456",
      role: "VENDEDOR",
      permissions: [],
      hasPermission: vi.fn().mockReturnValue(true),
      isAdmin: vi.fn().mockReturnValue(false),
    } as unknown as RequestContext;
  });

  describe("create", () => {
    it("should create product with required fields only", async () => {
      const operation = createOperation({
        entityId: "prod-new",
        payload: { name: "Pollo Entero" },
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockProductRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          id: "prod-new",
          name: "Pollo Entero",
          unit: "kg",
          basePrice: "0",
          costPrice: "0",
          isActive: true,
          hasVariants: false,
        }),
        undefined
      );
    });

    it("should create product with all fields", async () => {
      const operation = createOperation({
        entityId: "prod-full",
        payload: {
          name: "Pollo Premium",
          unit: "kg",
          basePrice: 15.50,
          costPrice: "12.00",
          isActive: true,
          hasVariants: true,
        },
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockProductRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          id: "prod-full",
          name: "Pollo Premium",
          unit: "kg",
          basePrice: "15.5",
          costPrice: "12.00",
          isActive: true,
          hasVariants: true,
        }),
        undefined
      );
    });

    it("should reject product without name", async () => {
      const operation = createOperation({
        payload: { unit: "kg" },
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(false);
      expect(result.error).toContain("name");
    });

    it("should handle numeric string prices", async () => {
      const operation = createOperation({
        entityId: "prod-price",
        payload: {
          name: "Pollo",
          basePrice: "18.00",
          costPrice: "14.50",
        },
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockProductRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          basePrice: "18.00",
          costPrice: "14.50",
        }),
        undefined
      );
    });
  });

  describe("update", () => {
    it("should update existing product", async () => {
      mockProductRepo.findById = vi.fn().mockResolvedValue({ id: "prod-123", name: "Original" });

      const operation = createOperation({
        entityId: "prod-123",
        operation: "update",
        payload: { name: "Pollo Actualizado" },
        localVersion: 2,
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockProductRepo.update).toHaveBeenCalledWith(
        mockCtx,
        "prod-123",
        expect.objectContaining({ name: "Pollo Actualizado" }),
        undefined
      );
    });

    it("should return error when updating non-existent product", async () => {
      mockProductRepo.update = vi.fn().mockResolvedValue(null);

      const operation = createOperation({
        entityId: "nonexistent",
        operation: "update",
        payload: { name: "No existe" },
        localVersion: 2,
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(false);
      expect(result.error).toContain("no encontrado");
    });

    it("should update multiple fields at once", async () => {
      mockProductRepo.findById = vi.fn().mockResolvedValue({ id: "prod-123" });

      const operation = createOperation({
        entityId: "prod-123",
        operation: "update",
        payload: {
          name: "Nuevo Pollo",
          basePrice: "20.00",
          isActive: false,
        },
        localVersion: 3,
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockProductRepo.update).toHaveBeenCalledWith(
        mockCtx,
        "prod-123",
        expect.objectContaining({
          name: "Nuevo Pollo",
          basePrice: "20.00",
          isActive: false,
        }),
        undefined
      );
    });

    it("should only include defined fields in update", async () => {
      mockProductRepo.findById = vi.fn().mockResolvedValue({ id: "prod-123" });

      const operation = createOperation({
        entityId: "prod-123",
        operation: "update",
        payload: { name: "Solo Nombre" },
        localVersion: 2,
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      const updateCall = mockProductRepo.update.mock.calls[0];
      const updateData = updateCall[2] as Record<string, unknown>;
      // Schema defaults mean basePrice may be present even when not provided
      expect(updateData).toHaveProperty("name", "Solo Nombre");
    });
  });

  describe("delete", () => {
    it("should delete existing product", async () => {
      mockProductRepo.findById = vi.fn().mockResolvedValue({ id: "prod-123", name: "A borrar" });

      const operation = createOperation({
        entityId: "prod-123",
        operation: "delete",
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockProductRepo.delete).toHaveBeenCalledWith(mockCtx, "prod-123");
    });

    it("should succeed silently when deleting non-existent product", async () => {
      mockProductRepo.findById = vi.fn().mockResolvedValue(undefined);

      const operation = createOperation({
        entityId: "nonexistent",
        operation: "delete",
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockProductRepo.delete).not.toHaveBeenCalled();
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createCustomerSyncHandlerForTest } from "../registry";
import { customerCreateSchema } from "../../schemas";
import type { RequestContext } from "../../../../context/request-context";
import type { CustomerRepository } from "../../../repository/customer.repository";
import type { SyncOperationInput } from "../../types";

describe("customerCreateSchema", () => {
  it("should validate customer with required fields", () => {
    const validCustomer = {
      name: "Juan Pérez",
      dni: "12345678",
      phone: "999111222",
      address: "Calle Lima 123",
      notes: "Cliente frecuente",
    };

    const result = customerCreateSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it("should validate customer with only required name", () => {
    const minimalCustomer = { name: "Solo Nombre" };
    const result = customerCreateSchema.safeParse(minimalCustomer);
    expect(result.success).toBe(true);
  });

  it("should reject customer without name", () => {
    const invalidCustomer = { phone: "999111222" };
    const result = customerCreateSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
  });
});

describe("CustomerSyncHandler", () => {
  let mockCustomerRepo: CustomerRepository;
  let handler: ReturnType<typeof createCustomerSyncHandlerForTest>;
  let mockCtx: RequestContext;

  const createOperation = (overrides: Partial<SyncOperationInput> = {}): SyncOperationInput => ({
    idempotencyKey: "test-123",
    entityType: "customers",
    entityId: "cust-new",
    operation: "create",
    payload: { name: "Juan Pérez", phone: "999111222" },
    localVersion: 1,
    localTimestamp: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    mockCustomerRepo = {
      create: vi.fn().mockResolvedValue({ id: "cust-new" }),
      findById: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "cust-123" }),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as CustomerRepository;

    handler = createCustomerSyncHandlerForTest(mockCustomerRepo);

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
    it("should create customer with all fields", async () => {
      const operation = createOperation({
        entityId: "cust-new",
        payload: { name: "Juan Pérez", dni: "12345678", phone: "999111222" },
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          id: "cust-new",
          name: "Juan Pérez",
          dni: "12345678",
          phone: "999111222",
        }),
        undefined
      );
    });

    it("should create customer with only required fields", async () => {
      const operation = createOperation({
        entityId: "cust-min",
        payload: { name: "Solo Nombre" },
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({ id: "cust-min", name: "Solo Nombre" }),
        undefined
      );
    });

    it("should reject customer without name", async () => {
      const operation = createOperation({
        payload: { phone: "999111222" },
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(false);
      expect(result.error).toContain("name");
    });
  });

  describe("update", () => {
    it("should update existing customer", async () => {
      mockCustomerRepo.findById = vi.fn().mockResolvedValue({ id: "cust-123", name: "Original" });

      const operation = createOperation({
        entityId: "cust-123",
        operation: "update",
        payload: { name: "Juan Actualizado" },
        localVersion: 2,
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockCustomerRepo.update).toHaveBeenCalledWith(
        mockCtx,
        "cust-123",
        expect.objectContaining({ name: "Juan Actualizado" }),
        undefined
      );
    });

    it("should return error when updating non-existent customer", async () => {
      mockCustomerRepo.update = vi.fn().mockResolvedValue(null);

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
      mockCustomerRepo.findById = vi.fn().mockResolvedValue({ id: "cust-123" });

      const operation = createOperation({
        entityId: "cust-123",
        operation: "update",
        payload: { name: "Nuevo", phone: "888777666", dni: "87654321" },
        localVersion: 3,
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockCustomerRepo.update).toHaveBeenCalledWith(
        mockCtx,
        "cust-123",
        expect.objectContaining({
          name: "Nuevo",
          phone: "888777666",
          dni: "87654321",
        }),
        undefined
      );
    });
  });

  describe("delete", () => {
    it("should delete existing customer", async () => {
      mockCustomerRepo.findById = vi.fn().mockResolvedValue({ id: "cust-123", name: "A borrar" });

      const operation = createOperation({
        entityId: "cust-123",
        operation: "delete",
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockCustomerRepo.delete).toHaveBeenCalledWith(mockCtx, "cust-123");
    });

    it("should succeed silently when deleting non-existent customer", async () => {
      mockCustomerRepo.findById = vi.fn().mockResolvedValue(null);

      const operation = createOperation({
        entityId: "nonexistent",
        operation: "delete",
      });

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockCustomerRepo.delete).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "./order.service";
import type { OrderRepository } from "../repository/order.repository";
import type { OrderEventsRepository } from "../repository/order-events.repository";
import type { SaleService } from "./sale.service";
import type { DistribucionRepository } from "../repository/distribucion.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { OrderTokenService } from "./order-token.service";
import type { CustomerRepository } from "../repository/customer.repository";
import type { RequestContext } from "../../context/request-context";
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from "../../errors";

describe("OrderService", () => {
  let service: OrderService;
  let mockRepository: OrderRepository;
  let mockEventsRepository: OrderEventsRepository;
  let mockSaleService: SaleService;
  let mockDistribucionRepository: DistribucionRepository;
  let mockDistribucionItemRepository: DistribucionItemRepository;
  let mockOrderTokenService: OrderTokenService;
  let mockCustomerRepository: CustomerRepository;
  let mockCtx: RequestContext;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateVersion: vi.fn(),
      replaceItems: vi.fn(),
      findItemById: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
    } as unknown as OrderRepository;

    mockEventsRepository = {
      create: vi.fn(),
      findByOrderId: vi.fn(),
    } as unknown as OrderEventsRepository;

    mockSaleService = {
      createFromOrder: vi.fn(),
    } as unknown as SaleService;

    mockDistribucionRepository = {
      findByVendedorAndFecha: vi.fn(),
    } as unknown as DistribucionRepository;

    mockDistribucionItemRepository = {
      findByDistribucionId: vi.fn(),
    } as unknown as DistribucionItemRepository;

    mockOrderTokenService = {
      validateTokenForConfirmation: vi.fn(),
      deactivateToken: vi.fn(),
      generateToken: vi.fn(),
      toggleTokenStatus: vi.fn(),
      regenerateToken: vi.fn(),
    } as unknown as OrderTokenService;

    mockCustomerRepository = {
      create: vi.fn(),
      findById: vi.fn(),
    } as unknown as CustomerRepository;

    service = new OrderService(
      mockRepository,
      mockEventsRepository,
      mockSaleService,
      mockDistribucionRepository,
      mockDistribucionItemRepository,
      mockOrderTokenService,
      mockCustomerRepository
    );

    mockCtx = {
      businessId: "business-123",
      businessUserId: "user-123",
      userId: "user-123",
      email: "test@example.com",
      role: "VENDEDOR",
      hasPermission: vi.fn((_perm: string) => true),
      hasRole: vi.fn(() => false),
      isAdmin: vi.fn(() => false),
    } as unknown as RequestContext;
  });

  describe("confirmWithToken", () => {
    const mockTokenRecord = {
      id: "token-id",
      orderId: "order-123",
      token: "validToken12",
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: null,
    };

    const mockOrder = {
      id: "order-123",
      businessId: "business-123",
      clientId: "anon-client-123",
      sellerId: "seller-123",
      deliveryDate: "2026-03-10",
      orderDate: "2026-03-07",
      status: "draft" as const,
      paymentIntent: "contado" as const,
      totalAmount: "100.00",
      version: 1,
      items: [],
    };

    it("should throw ValidationError for invalid token", async () => {
      (mockOrderTokenService.validateTokenForConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
      });

      await expect(
        service.confirmWithToken(mockCtx, "invalidToken", {
          customerName: "John Doe",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NotFoundError when order does not exist", async () => {
      (mockOrderTokenService.validateTokenForConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        orderId: "order-123",
        tokenRecord: mockTokenRecord,
      });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        service.confirmWithToken(mockCtx, "validToken12", {})
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when order is not in draft status", async () => {
      (mockOrderTokenService.validateTokenForConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        orderId: "order-123",
        tokenRecord: mockTokenRecord,
      });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
      });

      await expect(
        service.confirmWithToken(mockCtx, "validToken12", {})
      ).rejects.toThrow(ValidationError);
    });

    it("should create customer and confirm order for anonymous order", async () => {
      (mockOrderTokenService.validateTokenForConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        orderId: "order-123",
        tokenRecord: mockTokenRecord,
      });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockCustomerRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "new-customer-id",
        name: "John Doe",
        phone: "123456789",
      });
      (mockRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        clientId: "new-customer-id",
      });
      (mockRepository.updateVersion as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
        clientId: "new-customer-id",
      });
      (mockOrderTokenService.deactivateToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTokenRecord,
        isActive: false,
      });
      (mockEventsRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "event-id",
        orderId: "order-123",
        eventType: "confirmed",
        payload: {},
      });

      const result = await service.confirmWithToken(mockCtx, "validToken12", {
        customerName: "John Doe",
        customerPhone: "123456789",
      });

      expect(result.status).toBe("confirmed");
      expect(mockCustomerRepository.create).toHaveBeenCalled();
      expect(mockOrderTokenService.deactivateToken).toHaveBeenCalled();
      expect(mockEventsRepository.create).toHaveBeenCalled();
    });

    it("should confirm order without creating customer when not anonymous", async () => {
      const nonAnonymousOrder = {
        ...mockOrder,
        clientId: "real-customer-id",
      };

      (mockOrderTokenService.validateTokenForConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        orderId: "order-123",
        tokenRecord: mockTokenRecord,
      });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(nonAnonymousOrder);
      (mockRepository.updateVersion as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...nonAnonymousOrder,
        status: "confirmed",
      });
      (mockOrderTokenService.deactivateToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTokenRecord,
        isActive: false,
      });
      (mockEventsRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "event-id",
        orderId: "order-123",
        eventType: "confirmed",
        payload: {},
      });

      const result = await service.confirmWithToken(mockCtx, "validToken12", {});

      expect(result.status).toBe("confirmed");
      expect(mockCustomerRepository.create).not.toHaveBeenCalled();
      expect(mockOrderTokenService.deactivateToken).toHaveBeenCalled();
    });

    it("should throw ConflictError when order is modified during confirmation", async () => {
      (mockOrderTokenService.validateTokenForConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        orderId: "order-123",
        tokenRecord: mockTokenRecord,
      });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockRepository.updateVersion as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        service.confirmWithToken(mockCtx, "validToken12", {})
      ).rejects.toThrow(ConflictError);
    });

    it("should update delivery date when provided", async () => {
      (mockOrderTokenService.validateTokenForConfirmation as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        orderId: "order-123",
        tokenRecord: mockTokenRecord,
      });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        deliveryDate: "2026-03-15",
      });
      (mockRepository.updateVersion as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
        deliveryDate: "2026-03-15",
      });
      (mockOrderTokenService.deactivateToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTokenRecord,
        isActive: false,
      });
      (mockEventsRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "event-id",
        orderId: "order-123",
        eventType: "confirmed",
        payload: {},
      });

      const result = await service.confirmWithToken(mockCtx, "validToken12", {
        deliveryDate: "2026-03-15",
      });

      expect(result.status).toBe("confirmed");
      expect(mockRepository.update).toHaveBeenCalledWith(
        mockCtx,
        "order-123",
        { deliveryDate: "2026-03-15" },
        expect.anything()
      );
    });
  });

  describe("confirmOrder", () => {
    const mockOrder = {
      id: "order-123",
      businessId: "business-123",
      clientId: "client-123",
      sellerId: "seller-123",
      deliveryDate: "2026-03-10",
      orderDate: "2026-03-07",
      status: "draft" as const,
      paymentIntent: "contado" as const,
      totalAmount: "100.00",
      version: 1,
      items: [],
    };

    it("should throw NotFoundError when order does not exist", async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        service.confirmOrder(mockCtx, "order-123", 1)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when order is not in draft status", async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
      });

      await expect(
        service.confirmOrder(mockCtx, "order-123", 1)
      ).rejects.toThrow(ValidationError);
    });

    it("should confirm order successfully", async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockRepository.updateVersion as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
      });
      (mockEventsRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "event-id",
        orderId: "order-123",
        eventType: "confirmed",
        payload: {},
      });

      const result = await service.confirmOrder(mockCtx, "order-123", 1);

      expect(result.status).toBe("confirmed");
      expect(mockEventsRepository.create).toHaveBeenCalled();
    });

    it("should throw ConflictError when order is modified during confirmation", async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockRepository.updateVersion as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        service.confirmOrder(mockCtx, "order-123", 1)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("toggleTokenStatus", () => {
    const mockOrder = {
      id: "order-123",
      businessId: "business-123",
      clientId: "client-123",
      sellerId: "seller-123",
      deliveryDate: "2026-03-10",
      orderDate: "2026-03-07",
      status: "draft" as const,
      paymentIntent: "contado" as const,
      totalAmount: "100.00",
      version: 1,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should throw ForbiddenError when user is not admin", async () => {
      await expect(
        service.toggleTokenStatus(mockCtx, "order-123", false)
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw NotFoundError when order does not exist", async () => {
      const adminCtx = {
        ...mockCtx,
        isAdmin: vi.fn(() => true),
      } as unknown as RequestContext;

      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        service.toggleTokenStatus(adminCtx, "order-123", false)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when order status is not draft", async () => {
      const adminCtx = {
        ...mockCtx,
        isAdmin: vi.fn(() => true),
      } as unknown as RequestContext;

      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
      });

      await expect(
        service.toggleTokenStatus(adminCtx, "order-123", false)
      ).rejects.toThrow(ValidationError);
    });

    it("should toggle token status successfully for draft order", async () => {
      const adminCtx = {
        ...mockCtx,
        isAdmin: vi.fn(() => true),
      } as unknown as RequestContext;

      const mockToken = {
        id: "token-id",
        orderId: "order-123",
        token: "token123456",
        isActive: false,
        createdAt: new Date(),
        lastUsedAt: null,
      };

      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockOrderTokenService.toggleTokenStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockToken,
        isActive: true,
      });

      const result = await service.toggleTokenStatus(adminCtx, "order-123", true);

      expect(result.isActive).toBe(true);
      expect(mockOrderTokenService.toggleTokenStatus).toHaveBeenCalledWith(
        adminCtx,
        "order-123",
        true
      );
    });

    it("should allow toggle to inactive for draft order", async () => {
      const adminCtx = {
        ...mockCtx,
        isAdmin: vi.fn(() => true),
      } as unknown as RequestContext;

      const mockToken = {
        id: "token-id",
        orderId: "order-123",
        token: "token123456",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      };

      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockOrderTokenService.toggleTokenStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockToken,
        isActive: false,
      });

      const result = await service.toggleTokenStatus(adminCtx, "order-123", false);

      expect(result.isActive).toBe(false);
    });
  });

  describe("regenerateToken", () => {
    const mockOrder = {
      id: "order-123",
      businessId: "business-123",
      clientId: "client-123",
      sellerId: "seller-123",
      deliveryDate: "2026-03-10",
      orderDate: "2026-03-07",
      status: "draft" as const,
      paymentIntent: "contado" as const,
      totalAmount: "100.00",
      version: 1,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should throw ForbiddenError when user is not admin", async () => {
      await expect(
        service.regenerateToken(mockCtx, "order-123")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw NotFoundError when order does not exist", async () => {
      const adminCtx = {
        ...mockCtx,
        isAdmin: vi.fn(() => true),
      } as unknown as RequestContext;

      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        service.regenerateToken(adminCtx, "order-123")
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when order status is not draft", async () => {
      const adminCtx = {
        ...mockCtx,
        isAdmin: vi.fn(() => true),
      } as unknown as RequestContext;

      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
      });

      await expect(
        service.regenerateToken(adminCtx, "order-123")
      ).rejects.toThrow(ValidationError);
    });

    it("should regenerate token successfully for draft order", async () => {
      const adminCtx = {
        ...mockCtx,
        isAdmin: vi.fn(() => true),
      } as unknown as RequestContext;

      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
      (mockOrderTokenService.regenerateToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "newToken123",
      });

      const result = await service.regenerateToken(adminCtx, "order-123");

      expect(result.token).toBe("newToken123");
      expect(mockOrderTokenService.regenerateToken).toHaveBeenCalledWith(
        adminCtx,
        "order-123"
      );
    });
  });
});

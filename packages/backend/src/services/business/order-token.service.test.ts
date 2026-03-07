import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderTokenService } from "./order-token.service";
import type { OrderTokenRepository } from "../repository/order-token.repository";
import type { RequestContext } from "../../context/request-context";
import { ValidationError, ConflictError, NotFoundError } from "../../errors";

describe("OrderTokenService", () => {
  let service: OrderTokenService;
  let mockRepository: OrderTokenRepository;
  let mockCtx: RequestContext;

  beforeEach(() => {
    mockRepository = {
      findByOrderId: vi.fn(),
      findByToken: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      markUsed: vi.fn(),
      delete: vi.fn(),
      deleteByOrderId: vi.fn(),
      findById: vi.fn(),
    } as unknown as OrderTokenRepository;

    service = new OrderTokenService(mockRepository);

    mockCtx = {
      businessId: "business-123",
      businessUserId: "user-123",
      userId: "user-123",
      email: "test@example.com",
      role: "vendor",
      hasPermission: vi.fn((_perm: string) => true),
      isAdmin: vi.fn(() => false),
    } as unknown as RequestContext;
  });

  describe("generateToken", () => {
    it("should generate a token of exactly 12 characters", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      });

      const result = await service.generateToken(mockCtx, "order-123");

      expect(result.token).toHaveLength(12);
    });

    it("should reject if token already exists for order", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "existing-token",
        orderId: "order-123",
        token: "existing-token",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      });

      await expect(service.generateToken(mockCtx, "order-123")).rejects.toThrow(ConflictError);
    });

    it("should require orderId", async () => {
      await expect(service.generateToken(mockCtx, "")).rejects.toThrow(ValidationError);
    });
  });

  describe("validateToken", () => {
    it("should return valid=true for active token", async () => {
      (mockRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "validToken12",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      });
      (mockRepository.markUsed as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "validToken12",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });

      const result = await service.validateToken(mockCtx, "validToken12");

      expect(result.valid).toBe(true);
      expect(result.orderId).toBe("order-123");
    });

    it("should return valid=false for inactive token", async () => {
      (mockRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "inactiveToken",
        isActive: false,
        createdAt: new Date(),
        lastUsedAt: null,
      });

      const result = await service.validateToken(mockCtx, "inactiveToken");

      expect(result.valid).toBe(false);
    });

    it("should return valid=false for non-existent token", async () => {
      (mockRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await service.validateToken(mockCtx, "nonexistent");

      expect(result.valid).toBe(false);
    });

    it("should reject invalid token format", async () => {
      const result = await service.validateToken(mockCtx, "short");

      expect(result.valid).toBe(false);
    });

    it("should reject token with invalid characters", async () => {
      const result = await service.validateToken(mockCtx, "invalid@char!");

      expect(result.valid).toBe(false);
    });
  });

  describe("toggleTokenStatus", () => {
    it("should toggle token to active", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "token123456",
        isActive: false,
        createdAt: new Date(),
        lastUsedAt: null,
      });
      (mockRepository.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "token123456",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      });

      const result = await service.toggleTokenStatus(mockCtx, "order-123", true);

      expect(result.isActive).toBe(true);
    });

    it("should toggle token to inactive", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "token123456",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      });
      (mockRepository.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "token-id",
        orderId: "order-123",
        token: "token123456",
        isActive: false,
        createdAt: new Date(),
        lastUsedAt: null,
      });

      const result = await service.toggleTokenStatus(mockCtx, "order-123", false);

      expect(result.isActive).toBe(false);
    });

    it("should throw NotFoundError if token does not exist", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(service.toggleTokenStatus(mockCtx, "order-123", true)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("regenerateToken", () => {
    it("should create new token and delete old one", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "old-token-id",
        orderId: "order-123",
        token: "oldToken123",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      });
      (mockRepository.deleteByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "new-token-id",
        orderId: "order-123",
        token: "",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      });

      const result = await service.regenerateToken(mockCtx, "order-123");

      expect(result.token).toHaveLength(12);
      expect(mockRepository.deleteByOrderId).toHaveBeenCalledWith(mockCtx, "order-123");
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it("should throw NotFoundError if token does not exist", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(service.regenerateToken(mockCtx, "order-123")).rejects.toThrow(NotFoundError);
    });
  });

  describe("getTokenByOrderId", () => {
    it("should return token when exists", async () => {
      const token = {
        id: "token-id",
        orderId: "order-123",
        token: "token123456",
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      };
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue(token);

      const result = await service.getTokenByOrderId(mockCtx, "order-123");

      expect(result).toEqual(token);
    });

    it("should return null when token does not exist", async () => {
      (mockRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await service.getTokenByOrderId(mockCtx, "order-123");

      expect(result).toBeNull();
    });
  });
});

describe("Token generation utilities", () => {
  const TOKEN_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  const TOKEN_LENGTH = 12;

  function generateSecureToken(): string {
    const crypto = require("node:crypto");
    const bytes = crypto.randomBytes(8);
    let token = "";
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      token += TOKEN_CHARS[bytes[i % bytes.length] % TOKEN_CHARS.length];
    }
    return token;
  }

  it("should generate 100 unique tokens", () => {
    const tokens = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const token = generateSecureToken();
      tokens.add(token);
    }

    expect(tokens.size).toBe(100);
  });

  it("should only contain allowed characters (a-z, A-Z, 0-9, -, _)", () => {
    const allowedPattern = /^[a-zA-Z0-9_-]+$/;

    for (let i = 0; i < 100; i++) {
      const token = generateSecureToken();
      expect(token).toMatch(allowedPattern);
    }
  });

  it("should generate tokens of at least 12 characters", () => {
    for (let i = 0; i < 100; i++) {
      const token = generateSecureToken();
      expect(token.length).toBeGreaterThanOrEqual(12);
    }
  });
});

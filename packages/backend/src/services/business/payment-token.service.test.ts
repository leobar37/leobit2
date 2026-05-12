import { describe, expect, it, vi } from "vitest";
import { PaymentTokenService } from "./payment-token.service";

describe("PaymentTokenService", () => {
  const ctx = {
    businessId: "biz-1",
    businessUserId: "user-1",
  };

  it("returns the existing token when a payment already has one", async () => {
    const repository = {
      findByPaymentId: vi.fn().mockResolvedValue({
        id: "token-1",
        paymentId: "payment-1",
        token: "existing1234",
        isActive: true,
      }),
      create: vi.fn(),
      tokenExists: vi.fn(),
    };
    const paymentRepository = {
      findById: vi.fn().mockResolvedValue({ id: "payment-1" }),
    };

    const service = new PaymentTokenService(
      repository as never,
      paymentRepository as never
    );

    const result = await service.generateToken(ctx as never, "payment-1");

    expect(result).toEqual({
      id: "token-1",
      paymentId: "payment-1",
      token: "existing1234",
      isActive: true,
    });
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.tokenExists).not.toHaveBeenCalled();
  });
});

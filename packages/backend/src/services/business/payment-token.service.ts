import { randomBytes } from "node:crypto";
import type { PaymentTokenRepository } from "../repository/payment-token.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { RequestContext } from "../../context/request-context";
import type { PaymentToken } from "../../db/schema/payment-tokens";
import { NotFoundError, ValidationError } from "../../errors";

const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9_-]+$/;
const TOKEN_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const TOKEN_LENGTH = 12;
const MAX_TOKEN_ATTEMPTS = 10;
const DEFAULT_EXPIRATION_DAYS = 7;

function generateSecureToken(): string {
  const bytes = randomBytes(8);
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARS[bytes[i % bytes.length] % TOKEN_CHARS.length];
  }
  return token;
}

export function isValidPaymentTokenFormat(token: string): boolean {
  return token.length === TOKEN_LENGTH && ALLOWED_CHARS_REGEX.test(token);
}

export class PaymentTokenService {
  constructor(
    private repository: PaymentTokenRepository,
    private paymentRepository: PaymentRepository
  ) {}

  async generateToken(
    ctx: RequestContext,
    paymentId: string
  ): Promise<{ token: string }> {
    if (!paymentId) {
      throw new ValidationError("El ID del pago es requerido");
    }

    const payment = await this.paymentRepository.findById(ctx, paymentId);
    if (!payment) {
      throw new NotFoundError("Pago no encontrado");
    }

    const existingToken = await this.repository.findByPaymentId(ctx, paymentId);
    if (existingToken) {
      return { token: existingToken.token };
    }

    let token: string;
    let attempts = 0;

    do {
      token = generateSecureToken();
      attempts++;

      if (attempts >= MAX_TOKEN_ATTEMPTS) {
        throw new Error("No se pudo generar un token único después de múltiples intentos");
      }

      const existing = await this.repository.tokenExists(ctx, token);
      if (!existing) {
        break;
      }
    } while (true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRATION_DAYS);

    await this.repository.create(ctx, { paymentId, token, expiresAt });

    return { token };
  }

  async getTokenByPaymentId(
    ctx: RequestContext,
    paymentId: string
  ): Promise<PaymentToken | null> {
    if (!paymentId) {
      throw new ValidationError("El ID del pago es requerido");
    }

    return (await this.repository.findByPaymentId(ctx, paymentId)) ?? null;
  }

  async toggleTokenStatus(
    ctx: RequestContext,
    paymentId: string,
    isActive: boolean
  ): Promise<PaymentToken> {
    if (!paymentId) {
      throw new ValidationError("El ID del pago es requerido");
    }

    const token = await this.repository.findByPaymentId(ctx, paymentId);
    if (!token) {
      throw new NotFoundError("Token del pago");
    }

    const updated = await this.repository.updateStatus(ctx, token.id, isActive);
    if (!updated) {
      throw new Error("No se pudo actualizar el estado del token");
    }

    return updated;
  }

  async regenerateToken(
    ctx: RequestContext,
    paymentId: string
  ): Promise<{ token: string }> {
    if (!paymentId) {
      throw new ValidationError("El ID del pago es requerido");
    }

    const existingToken = await this.repository.findByPaymentId(ctx, paymentId);
    if (!existingToken) {
      throw new NotFoundError("Token del pago");
    }

    await this.repository.deleteByPaymentId(ctx, paymentId);

    return this.generateToken(ctx, paymentId);
  }

  async validateTokenPublic(token: string): Promise<{
    valid: boolean;
    tokenRecord?: PaymentToken & {
      payment: {
        id: string;
        businessId: string;
        customerId: string;
        proofImageId: string | null;
      };
      business: {
        publicCatalogSlug: string | null;
      };
    };
  }> {
    if (!token || !isValidPaymentTokenFormat(token)) {
      return { valid: false };
    }

    const tokenRecord = await this.repository.findByTokenPublic(token);
    if (!tokenRecord || !tokenRecord.isActive) {
      return { valid: false };
    }

    if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
      return { valid: false };
    }

    await this.repository.markUsed(tokenRecord.id);
    return { valid: true, tokenRecord };
  }
}

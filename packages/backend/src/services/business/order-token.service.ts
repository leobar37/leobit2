import { randomBytes } from "node:crypto";
import type { OrderTokenRepository } from "../repository/order-token.repository";
import type { RequestContext } from "../../context/request-context";
import type { OrderToken } from "../../db/schema";
import { NotFoundError, ValidationError, ConflictError } from "../../errors";
import type { DbTransaction } from "../repository/order.repository";

const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9_-]+$/;
const TOKEN_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const TOKEN_LENGTH = 12;
const MAX_TOKEN_ATTEMPTS = 10;

function generateSecureToken(): string {
  const bytes = randomBytes(8);
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARS[bytes[i % bytes.length] % TOKEN_CHARS.length];
  }
  return token;
}

function isValidTokenFormat(token: string): boolean {
  return token.length === TOKEN_LENGTH && ALLOWED_CHARS_REGEX.test(token);
}

export class OrderTokenService {
  constructor(private repository: OrderTokenRepository) {}

  async generateToken(ctx: RequestContext, orderId: string): Promise<{ token: string }> {
    if (!orderId) {
      throw new ValidationError("El ID del pedido es requerido");
    }

    // Check if token already exists for this order
    const existingToken = await this.repository.findByOrderId(ctx, orderId);
    if (existingToken) {
      throw new ConflictError("Ya existe un token para este pedido");
    }

    // Generate unique token
    let token: string;
    let attempts = 0;

    do {
      token = generateSecureToken();
      attempts++;

      if (attempts >= MAX_TOKEN_ATTEMPTS) {
        throw new Error("No se pudo generar un token único después de múltiples intentos");
      }

      const existing = await this.repository.findByToken(ctx, token);
      if (!existing) {
        break;
      }
    } while (true);

    // Create the token
    await this.repository.create(ctx, { orderId, token });

    return { token };
  }

  async validateToken(ctx: RequestContext, token: string): Promise<{ valid: boolean; orderId?: string }> {
    if (!token || !isValidTokenFormat(token)) {
      return { valid: false };
    }

    const tokenRecord = await this.repository.findByToken(ctx, token);

    if (!tokenRecord) {
      return { valid: false };
    }

    if (!tokenRecord.isActive) {
      return { valid: false };
    }

    // Mark as used
    await this.repository.markUsed(ctx, tokenRecord.id);

    return { valid: true, orderId: tokenRecord.orderId };
  }

  async validateTokenPublic(token: string): Promise<{
    valid: boolean;
    tokenRecord?: OrderToken & { order: { id: string; status: string; businessId: string } };
  }> {
    if (!token || !isValidTokenFormat(token)) {
      return { valid: false };
    }

    const tokenRecord = await this.repository.findByTokenPublic(token);

    if (!tokenRecord) {
      return { valid: false };
    }

    if (!tokenRecord.isActive) {
      return { valid: false };
    }

    return { valid: true, tokenRecord };
  }

  async toggleTokenStatus(ctx: RequestContext, orderId: string, isActive: boolean): Promise<OrderToken> {
    if (!orderId) {
      throw new ValidationError("El ID del pedido es requerido");
    }

    const token = await this.repository.findByOrderId(ctx, orderId);

    if (!token) {
      throw new NotFoundError("Token del pedido");
    }

    const updated = await this.repository.updateStatus(ctx, token.id, isActive);

    if (!updated) {
      throw new Error("No se pudo actualizar el estado del token");
    }

    return updated;
  }

  async regenerateToken(ctx: RequestContext, orderId: string): Promise<{ token: string }> {
    if (!orderId) {
      throw new ValidationError("El ID del pedido es requerido");
    }

    const existingToken = await this.repository.findByOrderId(ctx, orderId);

    if (!existingToken) {
      throw new NotFoundError("Token del pedido");
    }

    // Delete the old token
    await this.repository.deleteByOrderId(ctx, orderId);

    // Generate new unique token
    let token: string;
    let attempts = 0;

    do {
      token = generateSecureToken();
      attempts++;

      if (attempts >= MAX_TOKEN_ATTEMPTS) {
        throw new Error("No se pudo generar un token único después de múltiples intentos");
      }

      const existing = await this.repository.findByToken(ctx, token);
      if (!existing) {
        break;
      }
    } while (true);

    // Create the new token
    await this.repository.create(ctx, { orderId, token });

    return { token };
  }

  async getTokenByOrderId(ctx: RequestContext, orderId: string): Promise<OrderToken | null> {
    if (!orderId) {
      throw new ValidationError("El ID del pedido es requerido");
    }

    const token = await this.repository.findByOrderId(ctx, orderId);
    return token || null;
  }

  async validateTokenForConfirmation(
    ctx: RequestContext,
    token: string
  ): Promise<{ valid: boolean; orderId?: string; tokenRecord?: OrderToken }> {
    if (!token || !isValidTokenFormat(token)) {
      return { valid: false };
    }

    const tokenRecord = await this.repository.findByToken(ctx, token);

    if (!tokenRecord) {
      return { valid: false };
    }

    if (!tokenRecord.isActive) {
      return { valid: false };
    }

    return { valid: true, orderId: tokenRecord.orderId, tokenRecord };
  }

  async deactivateToken(
    ctx: RequestContext,
    tokenId: string,
    tx?: Parameters<typeof import("drizzle-orm").db>[0]
  ): Promise<OrderToken> {
    const updated = await this.repository.updateStatus(ctx, tokenId, false, tx);

    if (!updated) {
      throw new Error("No se pudo desactivar el token");
    }

    return updated;
  }
}

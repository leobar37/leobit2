import { randomBytes } from "node:crypto";
import type { SaleTokenRepository } from "../repository/sale-token.repository";
import type { RequestContext } from "../../context/request-context";
import type { SaleToken } from "../../db/schema/sale-tokens";
import { NotFoundError, ValidationError, ConflictError } from "../../errors";

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

export class SaleTokenService {
  constructor(private repository: SaleTokenRepository) {}

  async createToken(
    ctx: RequestContext,
    saleId: string,
    expiresInHours: number = 24
  ): Promise<{ token: string }> {
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    if (expiresInHours <= 0) {
      throw new ValidationError("El tiempo de expiración debe ser mayor a 0");
    }

    // Check if valid token already exists for this sale
    const existingValidToken = await this.repository.findValidBySaleId(ctx, saleId);
    if (existingValidToken) {
      throw new ConflictError("Ya existe un token válido para esta venta");
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

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create the token
    await this.repository.create(ctx, { saleId, token, expiresAt });

    return { token };
  }

  async validateToken(
    ctx: RequestContext,
    token: string
  ): Promise<{ valid: boolean; saleId?: string; tokenRecord?: SaleToken }> {
    if (!token || !isValidTokenFormat(token)) {
      return { valid: false };
    }

    const tokenRecord = await this.repository.findByToken(ctx, token);

    if (!tokenRecord) {
      return { valid: false };
    }

    // Check if token is already used
    if (tokenRecord.usedAt) {
      return { valid: false };
    }

    // Check if token has expired
    const now = new Date();
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < now) {
      return { valid: false };
    }

    // Mark token as used
    await this.repository.markAsUsed(ctx, tokenRecord.id);

    return { valid: true, saleId: tokenRecord.saleId, tokenRecord };
  }

  async markTokenUsed(ctx: RequestContext, token: string): Promise<SaleToken> {
    if (!token || !isValidTokenFormat(token)) {
      throw new ValidationError("Token inválido");
    }

    const tokenRecord = await this.repository.findByToken(ctx, token);

    if (!tokenRecord) {
      throw new NotFoundError("Token de venta");
    }

    if (tokenRecord.usedAt) {
      throw new ConflictError("El token ya ha sido utilizado");
    }

    const updated = await this.repository.markAsUsed(ctx, tokenRecord.id);

    if (!updated) {
      throw new Error("No se pudo marcar el token como usado");
    }

    return updated;
  }

  async getValidTokenBySaleId(ctx: RequestContext, saleId: string): Promise<SaleToken | null> {
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    const token = await this.repository.findValidBySaleId(ctx, saleId);
    return token || null;
  }

  async regenerateToken(
    ctx: RequestContext,
    saleId: string,
    expiresInHours: number = 24
  ): Promise<{ token: string }> {
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    // Delete existing tokens for this sale
    await this.repository.deleteBySaleId(ctx, saleId);

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

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create the new token
    await this.repository.create(ctx, { saleId, token, expiresAt });

    return { token };
  }
}

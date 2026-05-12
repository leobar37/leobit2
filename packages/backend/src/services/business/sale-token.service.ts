/**
 * Sale Token Service
 * Business logic for generating and managing sale tokens
 */
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { SaleTokenRepository } from "../repository/sale-token.repository";
import type { SaleRepository } from "../repository/sale.repository";
import type { RequestContext } from "../../context/request-context";
import type { SaleToken } from "../../db/schema/sale-tokens";
import { sales } from "../../db/schema/sales";
import { NotFoundError, ValidationError, ConflictError } from "../../errors";
import { db } from "../../lib/db";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9_-]+$/;
const TOKEN_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const TOKEN_LENGTH = 12;
const MAX_TOKEN_ATTEMPTS = 10;
const DEFAULT_EXPIRATION_DAYS = 7;

/**
 * Generate a secure random token
 */
function generateSecureToken(): string {
  const bytes = randomBytes(8);
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARS[bytes[i % bytes.length] % TOKEN_CHARS.length];
  }
  return token;
}

/**
 * Validate token format
 */
export function isValidTokenFormat(token: string): boolean {
  return token.length === TOKEN_LENGTH && ALLOWED_CHARS_REGEX.test(token);
}

export class SaleTokenService {
  constructor(
    private repository: SaleTokenRepository,
    private saleRepository: SaleRepository
  ) {}

  /**
   * Generate a new token for a sale
   */
  async generateToken(ctx: RequestContext, saleId: string): Promise<{ token: string }> {
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    // Verify the sale exists
    const sale = await this.saleRepository.findById(ctx, saleId);
    if (!sale) {
      throw new NotFoundError("Venta no encontrada");
    }

    // Check if token already exists for this sale
    const existingToken = await this.repository.findBySaleId(ctx, saleId);
    if (existingToken) {
      throw new ConflictError("Ya existe un token para esta venta");
    }

    const { token, expiresAt } = await this.buildUniqueToken((candidate) =>
      this.repository.tokenExists(ctx, candidate)
    );

    await this.repository.create(ctx, { saleId, token, expiresAt });

    return { token };
  }

  async generatePublicTokenForSale(
    businessId: string,
    saleId: string,
    tx?: DbTransaction
  ): Promise<{ token: string }> {
    if (!businessId) {
      throw new ValidationError("El negocio es requerido");
    }
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    const existingToken = await this.repository.findBySaleIdPublic(saleId, businessId, tx);
    if (existingToken) {
      throw new ConflictError("Ya existe un token para esta venta");
    }

    const executor = tx ?? db;
    const [sale] = await executor
      .select({ id: sales.id })
      .from(sales)
      .where(and(eq(sales.id, saleId), eq(sales.businessId, businessId)))
      .limit(1);

    if (!sale) {
      throw new NotFoundError("Venta no encontrada");
    }

    const { token, expiresAt } = await this.buildUniqueToken((candidate) =>
      this.repository.tokenExistsPublic(candidate, tx)
    );

    await this.repository.createPublic({ saleId, token, expiresAt }, tx);

    return { token };
  }

  /**
   * Validate a token (with context)
   */
  async validateToken(ctx: RequestContext, token: string): Promise<{ valid: boolean; saleId?: string }> {
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

    // Check if token has expired
    if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
      return { valid: false };
    }

    // Mark as used
    await this.repository.markUsed(ctx, tokenRecord.id);

    return { valid: true, saleId: tokenRecord.saleId };
  }

  /**
   * Validate a token (public - no context required)
   */
  async validateTokenPublic(token: string): Promise<{
    valid: boolean;
    tokenRecord?: SaleToken & {
      sale: { id: string; status: string; businessId: string; allowCustomerEdit: boolean };
    };
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

    // Check if token has expired
    if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
      return { valid: false };
    }

    return { valid: true, tokenRecord };
  }

  /**
   * Toggle token status (activate/deactivate) - for revoking access
   */
  async toggleTokenStatus(ctx: RequestContext, saleId: string, isActive: boolean): Promise<SaleToken> {
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    const token = await this.repository.findBySaleId(ctx, saleId);

    if (!token) {
      throw new NotFoundError("Token de la venta");
    }

    const updated = await this.repository.updateStatus(ctx, token.id, isActive);

    if (!updated) {
      throw new Error("No se pudo actualizar el estado del token");
    }

    return updated;
  }

  /**
   * Regenerate token (delete old, create new)
   */
  async regenerateToken(ctx: RequestContext, saleId: string): Promise<{ token: string }> {
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    const existingToken = await this.repository.findBySaleId(ctx, saleId);

    if (!existingToken) {
      throw new NotFoundError("Token de la venta");
    }

    // Delete the old token
    await this.repository.deleteBySaleId(ctx, saleId);

    const { token, expiresAt } = await this.buildUniqueToken((candidate) =>
      this.repository.tokenExists(ctx, candidate)
    );

    await this.repository.create(ctx, { saleId, token, expiresAt });

    return { token };
  }

  /**
   * Get token by sale ID
   */
  async getTokenBySaleId(ctx: RequestContext, saleId: string): Promise<SaleToken | null> {
    if (!saleId) {
      throw new ValidationError("El ID de la venta es requerido");
    }

    const token = await this.repository.findBySaleId(ctx, saleId);
    return token || null;
  }

  /**
   * Deactivate token (helper for cancellation)
   */
  async deactivateToken(
    ctx: RequestContext,
    saleId: string,
    tx?: DbTransaction
  ): Promise<void> {
    const token = await this.repository.findBySaleId(ctx, saleId);
    
    if (token) {
      await this.repository.updateStatus(ctx, token.id, false, tx);
    }
  }

  private async buildUniqueToken(
    exists: (token: string) => Promise<boolean>
  ): Promise<{ token: string; expiresAt: Date }> {
    let token: string;
    let attempts = 0;

    do {
      token = generateSecureToken();
      attempts++;

      if (attempts >= MAX_TOKEN_ATTEMPTS) {
        throw new Error("No se pudo generar un token único después de múltiples intentos");
      }

      if (!(await exists(token))) {
        break;
      }
    } while (true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRATION_DAYS);

    return { token, expiresAt };
  }
}

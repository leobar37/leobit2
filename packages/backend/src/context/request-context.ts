import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { businessUsers, businessUserRoleEnum } from "../db/schema";
import { ForbiddenError } from "../errors";
import type { BusinessCalculatorSettings, BusinessModeFlags } from "@avileo/shared";
import { getDefaultFlags, mergeBusinessModeFlags } from "@avileo/shared";
import { defaultCalculatorSettings } from "../db/schema/businesses";
import { TTLCache } from "../lib/cache";

type BusinessUserRole = typeof businessUserRoleEnum.enumValues[number];

/**
 * Cache key: userId:businessId (or userId:"default" when no target business)
 */
function buildCacheKey(userId: string, businessId?: string | null): string {
  return `${userId}:${businessId ?? "default"}`;
}

/**
 * Plain data object cached to avoid mutability issues.
 * A new RequestContext instance is created on each cache hit.
 */
interface CachedContextData {
  userId: string;
  email: string;
  name: string | undefined;
  businessId: string;
  businessUserId: string;
  role: BusinessUserRole;
  salesPoint: string | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isActive: boolean;
  calculatorSettings: BusinessCalculatorSettings;
  businessMode: string;
  modeFlags: BusinessModeFlags;
  sessionId?: string;
}

/**
 * Cache for RequestContext data.
 * TTL: 5 minutes with 30s jitter. Max 500 entries (LRU eviction).
 */
const contextCache = new TTLCache<string, CachedContextData>({
  defaultTtlMs: 5 * 60 * 1000,
  maxSize: 500,
  jitterMs: 30_000,
});

/**
 * Permisos disponibles en el sistema
 */
export type Permission =
  // Ventas
  | "sales.read"
  | "sales.write"
  | "sales.delete"
  | "sales.analytics"
  // Clientes
  | "customers.read"
  | "customers.write"
  | "customers.delete"
  // Productos/Inventario
  | "inventory.read"
  | "inventory.write"
  | "products.manage"
  // Negocio
  | "business.settings"
  | "business.users"
  | "business.analytics"
  | "reports.view"
  | "reports.export"
  | "suppliers.read"
  | "suppliers.write"
  | "purchases.read"
  | "purchases.write"
  // WhatsApp
  | "whatsapp.read"
  | "whatsapp.write"
  | "whatsapp.delete"
  // Tags
  | "tags.read"
  | "tags.write"
  | "*";

/**
 * Matriz de permisos por rol
 */
export const ROLE_PERMISSIONS: Record<BusinessUserRole, Permission[]> = {
  ADMIN_NEGOCIO: ["*"], // Todos los permisos
  VENDEDOR: [
    "sales.read",
    "sales.write",
    "customers.read",
    "customers.write",
    "inventory.read",
    "tags.read", // Vendedores pueden ver etiquetas
  ],
};

/**
 * RequestContext - Contexto de la petición con información del usuario,
 * negocio actual, rol y permisos.
 *
 * Reglas:
 * 1. SIEMPRE va como primer parámetro en repositories y services
 * 2. Se construye una vez por request (cached cross-request en memoria con TTL)
 * 3. Contiene businessId para filtrado multi-tenant
 */
export class RequestContext {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string | undefined,
    public readonly businessId: string,
    public readonly businessUserId: string,
    public readonly role: BusinessUserRole,
    public readonly salesPoint: string | null,
    public readonly permissions: Permission[],
    public readonly isAuthenticated: boolean,
    public readonly isActive: boolean,
    public readonly calculatorSettings: BusinessCalculatorSettings,
    public readonly businessMode: string,
    public readonly modeFlags: BusinessModeFlags,
    public readonly sessionId?: string
  ) {}

  get tenantId(): string {
    return this.businessId;
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: Permission): boolean {
    if (this.role === "ADMIN_NEGOCIO") return true;
    if (this.permissions.includes("*")) return true;
    return this.permissions.includes(permission);
  }

  /**
   * Verifica si el contexto pertenece a un negocio específico
   */
  belongsToBusiness(businessId: string): boolean {
    return this.businessId === businessId;
  }

  /**
   * Verifica si es administrador del negocio
   */
  isAdmin(): boolean {
    return this.role === "ADMIN_NEGOCIO";
  }

  /**
   * Verifica si tiene punto de venta asignado
   */
  hasSalesPoint(): boolean {
    return !!this.salesPoint;
  }

  /**
   * Creates a new context with a different user ID (for checking other users)
   */
  withUserId(userId: string): RequestContext {
    return new RequestContext(
      userId,
      this.email,
      this.name,
      this.businessId,
      this.businessUserId,
      this.role,
      this.salesPoint,
      this.permissions,
      this.isAuthenticated,
      this.isActive,
      this.calculatorSettings,
      this.businessMode,
      this.modeFlags,
      this.sessionId
    );
  }

  /**
   * Factory: Crear desde sesión de Better Auth
   * Consulta business_users para obtener el contexto del negocio.
   * Usa cache en memoria con TTL de 5 minutos para evitar queries repetidas.
   *
   * @param session - Better Auth session
   * @param targetBusinessId - Optional specific business ID to use (for multi-business users)
   */
  static async fromAuth(
    session: {
      user: { id: string; email: string; name?: string };
      session: { id: string };
    },
    targetBusinessId?: string | null
  ): Promise<RequestContext> {
    const { user, session: sess } = session;
    const cacheKey = buildCacheKey(user.id, targetBusinessId);

    const cached = contextCache.get(cacheKey);
    if (cached) {
      return new RequestContext(
        cached.userId,
        cached.email,
        cached.name,
        cached.businessId,
        cached.businessUserId,
        cached.role,
        cached.salesPoint,
        cached.permissions,
        cached.isAuthenticated,
        cached.isActive,
        cached.calculatorSettings,
        cached.businessMode,
        cached.modeFlags,
        cached.sessionId
      );
    }

    let membership;

    if (targetBusinessId) {
      // Look for specific business membership
      membership = await db.query.businessUsers.findFirst({
        where: and(
          eq(businessUsers.userId, user.id),
          eq(businessUsers.businessId, targetBusinessId)
        ),
        with: { business: true },
      });

      if (!membership) {
        throw new ForbiddenError("No perteneces a este negocio");
      }
    } else {
      // Fall back to first membership (backward compatibility)
      membership = await db.query.businessUsers.findFirst({
        where: eq(businessUsers.userId, user.id),
        with: { business: true },
      });

      if (!membership) {
        throw new ForbiddenError("Usuario no pertenece a ningún negocio");
      }
    }

    // Calcular permisos según el rol
    const permissions = ROLE_PERMISSIONS[membership.role] || [];

    // Get calculator settings from business or use defaults
    // Note: Drizzle's `with` can return business as array in type inference,
    // but at runtime it's a single object due to `findFirst`.
    const businessRecord = membership.business as { calculatorSettings?: BusinessCalculatorSettings; businessMode?: string; modeConfigOverrides?: Partial<BusinessModeFlags> } | undefined;
    const calculatorSettings = businessRecord?.calculatorSettings || defaultCalculatorSettings;

    // Resolve business mode and merged flags
    const businessMode = businessRecord?.businessMode || "polleria";
    const defaults = getDefaultFlags(businessMode);
    const overrides = businessRecord?.modeConfigOverrides || {};
    const modeFlags = mergeBusinessModeFlags(defaults, overrides);

    const data: CachedContextData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      businessId: membership.businessId,
      businessUserId: membership.id,
      role: membership.role,
      salesPoint: membership.salesPoint,
      permissions,
      isAuthenticated: true,
      isActive: membership.isActive,
      calculatorSettings,
      businessMode,
      modeFlags,
      sessionId: sess.id,
    };

    contextCache.set(cacheKey, data);

    return new RequestContext(
      data.userId,
      data.email,
      data.name,
      data.businessId,
      data.businessUserId,
      data.role,
      data.salesPoint,
      data.permissions,
      data.isAuthenticated,
      data.isActive,
      data.calculatorSettings,
      data.businessMode,
      data.modeFlags,
      data.sessionId
    );
  }

  /**
   * Invalidate ALL cache entries for a specific user across all businesses.
   * Call when membership/role data changes (e.g., user deactivated, role changed).
   */
  static invalidateCache(userId: string): void {
    const prefix = `${userId}:`;
    for (const key of contextCache.keys()) {
      if (key.startsWith(prefix)) {
        contextCache.delete(key);
      }
    }
  }

  /**
   * Get cache stats for monitoring/debugging.
   */
  static cacheStats(): { size: number } {
    return { size: contextCache.size() };
  }

  /**
   * Factory: Crear para rutas públicas (no autenticadas)
   */
  static forPublic(): RequestContext {
    const defaultFlags = getDefaultFlags("polleria");
    return new RequestContext(
      "",
      "",
      undefined,
      "public",
      "",
      "VENDEDOR",
      null,
      [],
      false,
      false,
      defaultCalculatorSettings,
      "polleria",
      defaultFlags
    );
  }

  /**
   * Factory: Crear para workers/jobs en background
   * Usa el rol de ADMIN para tener todos los permisos
   */
  static forWorker(businessId: string, businessUserId?: string): RequestContext {
    const defaultFlags = getDefaultFlags("polleria");
    return new RequestContext(
      "system",
      "system@avileo.com",
      "System",
      businessId,
      businessUserId || "system",
      "ADMIN_NEGOCIO",
      null,
      ["*"],
      true,
      true,
      defaultCalculatorSettings,
      "polleria",
      defaultFlags
    );
  }
}

export type { BusinessUserRole };

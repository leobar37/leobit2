import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { businessUsers, businessUserRoleEnum } from "../db/schema";

type BusinessUserRole = typeof businessUserRoleEnum.enumValues[number];

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
  // Reportes
  | "reports.view"
  | "reports.export"
  | "*"; // Todos los permisos

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
  ],
};

/**
 * RequestContext - Contexto de la petición con información del usuario,
 * negocio actual, rol y permisos.
 *
 * Reglas:
 * 1. SIEMPRE va como primer parámetro en repositories y services
 * 2. Se construye una vez por request (cached en el plugin)
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
    public readonly sessionId?: string
  ) {}

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
   * Factory: Crear desde sesión de Better Auth
   * Consulta business_users para obtener el contexto del negocio
   */
  static async fromAuth(session: {
    user: { id: string; email: string; name?: string };
    session: { id: string };
  }): Promise<RequestContext> {
    const { user, session: sess } = session;

    // Buscar la membresía del usuario en un negocio
    const membership = await db.query.businessUsers.findFirst({
      where: eq(businessUsers.userId, user.id),
      with: { business: true },
    });

    if (!membership) {
      throw new Error("Usuario no pertenece a ningún negocio");
    }

    // Calcular permisos según el rol
    const permissions = ROLE_PERMISSIONS[membership.role] || [];

    return new RequestContext(
      user.id,
      user.email,
      user.name,
      membership.businessId,
      membership.id,
      membership.role,
      membership.salesPoint,
      permissions,
      true, // isAuthenticated
      membership.isActive,
      sess.id
    );
  }

  /**
   * Factory: Crear para rutas públicas (no autenticadas)
   */
  static forPublic(): RequestContext {
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
      false
    );
  }

  /**
   * Factory: Crear para workers/jobs en background
   * Usa el rol de ADMIN para tener todos los permisos
   */
  static forWorker(businessId: string): RequestContext {
    return new RequestContext(
      "system",
      "system@avileo.com",
      "System",
      businessId,
      "system",
      "ADMIN_NEGOCIO",
      null,
      ["*"],
      true,
      true
    );
  }
}

export type { BusinessUserRole };

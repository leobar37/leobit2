import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";
import { db } from "../lib/db";
import { staffInvitations } from "../db/schema/staff-invitations";
import { businessUsers } from "../db/schema/businesses";
import { user } from "../db/schema/auth";

const INVITATION_EXPIRY_DAYS = 7;

function generateInvitationCode(): string {
  return randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
}

export const invitationRoutes = new Elysia({ prefix: "/invitations" })
  .use(requireAuth)
  .post(
    "/",
    async (ctx) => {
      const user = (ctx as any).user;
      const body = ctx.body as any;

      if (!user?.id) {
        return { success: false, error: "Sesión inválida" };
      }

      const membership = await db.query.businessUsers.findFirst({
        where: eq(businessUsers.userId, user.id),
      });

      if (!membership || membership.role !== "ADMIN_NEGOCIO") {
        return {
          success: false,
          error: "No tienes permiso para invitar",
        };
      }

      const existingAccount = await db.query.user.findFirst({
        where: eq(user.email, body.email),
      });

      if (existingAccount) {
        const existingMembership = await db.query.businessUsers.findFirst({
          where: eq(businessUsers.userId, existingAccount.id),
        });

        if (existingMembership) {
          return {
            success: false,
            error: "Este email ya pertenece a un negocio",
          };
        }
      }

      const token = generateInvitationCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

      const [invitation] = await db
        .insert(staffInvitations)
        .values({
          businessId: membership.businessId,
          email: body.email,
          inviteeName: body.name,
          salesPoint: body.salesPoint || null,
          token,
          invitedBy: user.id,
          expiresAt,
        })
        .returning();

      return {
        success: true,
        data: {
          invitationId: invitation.id,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        name: t.String({ minLength: 2 }),
        salesPoint: t.Optional(t.String()),
      }),
    }
  )
  .get("/", async (ctx) => {
    const user = (ctx as any).user;

    if (!user?.id) {
      return { success: false, error: "Sesión inválida" };
    }

    const membership = await db.query.businessUsers.findFirst({
      where: eq(businessUsers.userId, user.id),
    });

    if (!membership) {
      return { success: false, error: "No business found" };
    }

    const invitations = await db.query.staffInvitations.findMany({
      where: eq(staffInvitations.businessId, membership.businessId),
      orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
    });

    return {
      success: true,
      data: invitations,
    };
  })
  .post(
    "/:id/cancel",
    async (ctx) => {
      const user = (ctx as any).user;
      const params = ctx.params as any;
      
      const membership = await db.query.businessUsers.findFirst({
        where: eq(businessUsers.userId, user.id),
      });

      if (!membership || membership.role !== "ADMIN_NEGOCIO") {
        return {
          success: false,
          error: "No tienes permiso",
        };
      }

      const invitation = await db.query.staffInvitations.findFirst({
        where: eq(staffInvitations.id, params.id),
      });

      if (!invitation || invitation.businessId !== membership.businessId) {
        return { success: false, error: "Invitación no encontrada" };
      }

      await db
        .update(staffInvitations)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
        })
        .where(eq(staffInvitations.id, params.id));

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );

export const publicInvitationRoutes = new Elysia({
  prefix: "/public/invitations",
})
  .get(
    "/:token",
    async (ctx) => {
      const params = ctx.params as any;
      
      const invitation = await db.query.staffInvitations.findFirst({
        where: eq(staffInvitations.token, params.token),
      });

      if (!invitation) {
        return { success: false, error: "Invitación no encontrada" };
      }

      if (invitation.status !== "pending") {
        return { success: false, error: "Invitación ya procesada" };
      }

      if (invitation.expiresAt < new Date()) {
        await db
          .update(staffInvitations)
          .set({ status: "expired" })
          .where(eq(staffInvitations.id, invitation.id));
        return { success: false, error: "Invitación expirada" };
      }

      return {
        success: true,
        data: {
          email: invitation.email,
          name: invitation.inviteeName,
          salesPoint: invitation.salesPoint,
        },
      };
    },
    {
      params: t.Object({ token: t.String() }),
    }
  )
  .post(
    "/accept",
    async (ctx) => {
      const body = ctx.body as any;
      
      const invitation = await db.query.staffInvitations.findFirst({
        where: eq(staffInvitations.token, body.token),
      });

      if (!invitation) {
        return { success: false, error: "Invitación no encontrada" };
      }

      if (invitation.status !== "pending") {
        return { success: false, error: "Invitación ya procesada" };
      }

      if (invitation.expiresAt < new Date()) {
        await db
          .update(staffInvitations)
          .set({ status: "expired" })
          .where(eq(staffInvitations.id, invitation.id));
        return { success: false, error: "Invitación expirada" };
      }

      const existingMembership = await db.query.businessUsers.findFirst({
        where: eq(businessUsers.userId, body.userId),
      });

      if (existingMembership) {
        return {
          success: false,
          error: "El usuario ya pertenece a un negocio",
        };
      }

      await db.insert(businessUsers).values({
        businessId: invitation.businessId,
        userId: body.userId,
        role: "VENDEDOR",
        salesPoint: invitation.salesPoint,
      });

      await db
        .update(staffInvitations)
        .set({
          status: "accepted",
          acceptedBy: body.userId,
          acceptedAt: new Date(),
        })
        .where(eq(staffInvitations.id, invitation.id));

      return { success: true };
    },
    {
      body: t.Object({
        token: t.String(),
        userId: t.String(),
      }),
    }
  );
